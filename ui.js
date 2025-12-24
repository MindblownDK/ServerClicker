const UI = {
            // Internal runtime warnings tracker used when falling back from missing engine methods
            _fallbackWarnings: new Set(),
            getStateSet(name) {
                try {
                    if (typeof GAME === 'undefined' || !GAME.state) {
                        return new Set();
                    }
                    if (GAME.state[name]) return GAME.state[name];
                    GAME.state[name] = new Set();
                    return GAME.state[name];
                } catch(e) { console.warn('UI.getStateSet failed for', name, e); return new Set(); }
            },
            /**
             * Initialize all UI components and event handlers
             */
            init() {
                this.checkCookieConsent();
                console.log('UI.init: starting; GAME present?', typeof GAME !== 'undefined');
                this.setupTabNavigation();
                this.setupBuyAmountKeyboardListeners();
                this.setupClickerTab();
                this.setupServersTab();
                // Hide overlays that could be blocking UI visibility if no active state
                try {
                    if (typeof GAME !== 'undefined' && GAME.state && !GAME.state.currentBattle) {
                        const overlays = ['bossBattleOverlay','bossVictoryOverlay','bossDefeatOverlay','bossRiskOverlay','bossRunConfirmOverlay'];
                        overlays.forEach(id => {
                            const el = document.getElementById(id);
                            if (el && !el.classList.contains('hidden')) {
                                el.classList.add('hidden');
                                console.log('UI.init: hid overlay', id);
                            }
                        });
                    }
                } catch(e) { console.warn('UI.init: overlay hide error', e); }
                // Add other setup methods as needed
                this.setupDefeatOverlayButton();
                this.setupVictoryOverlayButton();
                // ...existing code for other UI setup...
                // Debug: counts of key interactive elements
                try {
                    const btns = document.querySelectorAll('button');
                    console.log('UI.init: button count=', btns.length);
                    const buyButtons = document.querySelectorAll('.buy-button, .upgrade-button, .mine-upgrade-btn');
                    console.log('UI.init: key buy buttons count=', buyButtons.length);
                    const clickCoin = document.getElementById('clickCoin');
                    console.log('UI.init: clickCoin element visible?', !!clickCoin && window.getComputedStyle(clickCoin).display !== 'none');
                } catch(e) { console.warn('UI.init: debug counts failed', e); }
                // Log overlays state for debugging: list any overlays that are visible (not .hidden)
                try {
                    const overlays = ['bossBattleOverlay','bossVictoryOverlay','bossDefeatOverlay','bossRiskOverlay','bossRunConfirmOverlay','gameModeModal','cookieConsentModal'];
                    const visible = overlays.filter(id => {
                        const el = document.getElementById(id);
                        return !!el && !el.classList.contains('hidden') && window.getComputedStyle(el).display !== 'none';
                    });
                    console.log('UI.init: visible overlays:', visible);
                } catch(e) { console.warn('UI.init: overlay visibility debug failed', e); }
                // Ensure UI is refreshed after init
                try { this.updateDisplay(); } catch (e) { console.warn('UI.init: updateDisplay failed', e); }
                try {
                    const container = document.querySelector('.container');
                    const content = document.querySelector('.content');
                    const clickerContainer = document.querySelector('.clicker-container');
                    console.log('UI.init: container display=', container ? window.getComputedStyle(container).display : 'missing', 'opacity=', container ? window.getComputedStyle(container).opacity : 'missing');
                    console.log('UI.init: content display=', content ? window.getComputedStyle(content).display : 'missing', 'opacity=', content ? window.getComputedStyle(content).opacity : 'missing');
                    console.log('UI.init: clickerContainer display=', clickerContainer ? window.getComputedStyle(clickerContainer).display : 'missing');
                    console.log('UI.init: balanceDisplay text=', (document.getElementById('balanceDisplay')||{textContent:'missing'}).textContent);
                } catch (e) { console.warn('UI.init: container visibility debug failed', e); }

                // Initialize Casino UI early so its panels and event handlers are ready at startup.
                try {
                    if (typeof this.setupCasinoTab === 'function') this.setupCasinoTab();
                } catch (e) { console.warn('UI.init: setupCasinoTab failed', e); }
                try {
                    if (typeof this.setupEventsTab === 'function') this.setupEventsTab();
                } catch (e) { console.warn('UI.init: setupEventsTab failed', e); }
                try {
                    if (typeof this.setupAchievementsTab === 'function') this.setupAchievementsTab();
                } catch (e) { console.warn('UI.init: setupAchievementsTab failed', e); }
                try {
                    if (typeof this.setupSkillTreesTab === 'function') this.setupSkillTreesTab();
                } catch (e) { console.warn('UI.init: setupSkillTreesTab failed', e); }
                try {
                    if (typeof this.setupMinesTab === 'function') this.setupMinesTab();
                } catch (e) { console.warn('UI.init: setupMinesTab failed', e); }
                try {
                    if (typeof this.setupBatteryTab === 'function') this.setupBatteryTab();
                } catch (e) { console.warn('UI.init: setupBatteryTab failed', e); }
                try {
                    if (typeof this.setupPowerTab === 'function') this.setupPowerTab();
                } catch (e) { console.warn('UI.init: setupPowerTab failed', e); }
                try {
                    if (typeof this.setupResearchTab === 'function') this.setupResearchTab();
                } catch (e) { console.warn('UI.init: setupResearchTab failed', e); }
            },
            /**
             * Update fighting stats in-place without switching tabs.
             */
            updateFightingStats() {
                try {
                    const grid = document.getElementById('fightingGrid');
                    if (!grid) return;
                    const statsEl = grid.querySelector('.combat-stats');
                    if (!statsEl) return;
                    const G = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                    const pStats = (G && typeof G.calculatePlayerCombatStats === 'function') ? G.calculatePlayerCombatStats() : { attack: 0, defense: 0, maxHp: 0 };
                    statsEl.innerHTML = `\n                        <div class="stat-item">⚔️ Damage: ${pStats.attack}</div>\n                        <div class="stat-item">❤️ Health: ${pStats.maxHp}</div>\n                        <div class="stat-item">🛡️ Defence: ${Math.round(Math.min(0.99, (pStats.defense || 0) / 100) * 100)}%</div>\n                    `;
                } catch (e) { console.warn('updateFightingStats failed', e); }
            },
        // Sound context
        audioContext: null,
    
        // Buy amount multiplier (1, 10, 100, or 'max')
        buyAmount: 1,
    
        /**
         * Sleep utility for async delays
         */
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Setup defeat overlay button event
         */
        setupDefeatOverlayButton() {
            const defeatBtn = document.getElementById('closeBossDefeat');
            if (defeatBtn) {
                defeatBtn.addEventListener('click', (e) => {
                    if (e && e.isTrusted === false) {
                        console.log('UI: ignored synthetic click on closeBossDefeat');
                        return;
                    }
                    // Try to call defeat close handlers if available
                    let called = false;
                    try {
                        if (typeof BossBattle !== 'undefined' && BossBattle && typeof BossBattle.closeDefeat === 'function') {
                            console.log('UI: calling BossBattle.closeDefeat at', new Date().toISOString());
                            BossBattle.closeDefeat(true);
                            called = true;
                        }
                    } catch (e) { console.warn('BossBattle.closeDefeat call failed', e); }
                    try {
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        if (!called && runtime && typeof runtime.closeDefeat === 'function') {
                            console.log('UI: calling runtime.closeDefeat at', new Date().toISOString());
                            runtime.closeDefeat(true);
                            called = true;
                        }
                    } catch (e) { console.warn('runtime.closeDefeat call failed', e); }
                    // Fallback: clear state and overlays
                    try {
                        const r = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        let needSave = false;
                        if (r && r.state) {
                            if (r.state.lastBattleResult) { delete r.state.lastBattleResult; needSave = true; }
                            if (r.state.currentBattle) { r.state.currentBattle = null; needSave = true; }
                        }
                        if (typeof BossBattle !== 'undefined' && BossBattle && BossBattle.currentBattle) {
                            BossBattle.currentBattle = null; needSave = true;
                        }
                        const defeatOverlay = document.getElementById('bossDefeatOverlay');
                        if (defeatOverlay) defeatOverlay.classList.add('hidden');
                        if (needSave) {
                            try { if (r && typeof r.saveGame === 'function') r.saveGame(); } catch(e) {}
                        }
                    } catch(e) { console.warn('Defeat fallback clearing error', e); }
                    // Re-render the tab after attempting to close overlays/state
                    try { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); } catch (e) { console.warn('setupFightingTab failed after defeat close', e); }
                });
            }
        },

        /**
         * Setup victory overlay button event
         */
        setupVictoryOverlayButton() {
            const victoryBtn = document.getElementById('closeBossVictory');
            if (victoryBtn) {
                victoryBtn.addEventListener('click', () => {
                    // Try to call victory close handlers if available
                    let called = false;
                    try {
                        if (typeof BossBattle !== 'undefined' && BossBattle && typeof BossBattle.closeVictory === 'function') {
                            BossBattle.closeVictory();
                            called = true;
                        }
                    } catch (e) { console.warn('BossBattle.closeVictory call failed', e); }
                    try {
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        if (!called && runtime && typeof runtime.closeVictory === 'function') {
                            runtime.closeVictory();
                            called = true;
                        }
                    } catch (e) { console.warn('runtime.closeVictory call failed', e); }
                    // Fallback: clear state and overlays
                    try {
                        const r = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        let needSave = false;
                        if (r && r.state) {
                            if (r.state.lastBattleResult) { delete r.state.lastBattleResult; needSave = true; }
                            if (r.state.currentBattle) { r.state.currentBattle = null; needSave = true; }
                        }
                        if (typeof BossBattle !== 'undefined' && BossBattle && BossBattle.currentBattle) {
                            BossBattle.currentBattle = null; needSave = true;
                        }
                        const victoryOverlay = document.getElementById('bossVictoryOverlay');
                        if (victoryOverlay) victoryOverlay.classList.add('hidden');
                        if (needSave) {
                            try { if (r && typeof r.saveGame === 'function') r.saveGame(); } catch(e) {}
                        }
                    } catch(e) { console.warn('Victory fallback clearing error', e); }
                    // Re-render the tab after attempting to close overlays/state
                    try { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); } catch (e) { console.warn('setupFightingTab failed after victory close', e); }
                });
            }
        },

    /**
     * Check if this is a new game and show mode selection
     */
    checkGameModeSelection() {
        const saveData = localStorage.getItem('hostxGameSave');
        const modal = document.getElementById('gameModeModal');

        // Helper: check if save is empty (no progress)
        function isEmptySave() {
            try {
                if (!saveData) return true;
                const parsed = JSON.parse(saveData);
                // No coins, no upgrades, only default building, no servers
                const noCoins = !parsed.coins || parsed.coins === 0;
                const noUpgrades = !parsed.clickUpgrades || Object.keys(parsed.clickUpgrades).length === 0;
                const onlyDefaultBuilding = parsed.buildings && Object.keys(parsed.buildings).length === 1 && parsed.buildings['0'];
                const noServers = !parsed.servers || Object.keys(parsed.servers).length === 0;
                return noCoins && noUpgrades && onlyDefaultBuilding && noServers;
            } catch (e) {
                return true;
            }
        }

        const runtime = (typeof window !== 'undefined' && typeof window.GAME !== 'undefined') ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);
        // If no save or empty save, show mode selection
        if (!saveData || isEmptySave() || !(runtime && ['normal','dark','crusader'].includes(runtime.state?.gameMode))) {
            modal.classList.remove('hidden');

            // Only add listeners once
            if (!window._modeListenersAdded) {
                window._modeListenersAdded = true;
                const normalModeCard = document.getElementById('selectNormalMode');
                const darkModeCard = document.getElementById('selectDarkMode');
                const crusaderModeCard = document.getElementById('selectCrusaderMode');

                normalModeCard.addEventListener('click', () => {
                    if (runtime) { runtime.state.darkMode = false; runtime.state.gameMode = 'normal'; }
                    modal.classList.add('hidden');
                    this.updateGameModeIndicator();
                    if (runtime && typeof runtime.saveGame === 'function') runtime.saveGame();
                });

                darkModeCard.addEventListener('click', () => {
                    if (runtime) { runtime.state.darkMode = true; runtime.state.gameMode = 'dark'; }
                    modal.classList.add('hidden');
                    this.updateGameModeIndicator();
                    if (runtime && typeof runtime.saveGame === 'function') runtime.saveGame();
                });

                crusaderModeCard.addEventListener('click', () => {
                    if (runtime) { runtime.state.darkMode = false; runtime.state.gameMode = 'crusader'; }
                    modal.classList.add('hidden');
                    this.updateGameModeIndicator();
                    if (runtime && typeof runtime.saveGame === 'function') runtime.saveGame();
                });
            }
        } else {
            // Save exists and has progress and mode is set, hide modal and update indicator
            modal.classList.add('hidden');
            this.updateGameModeIndicator();
        }
    },

    /**
     * Update game mode indicator in header
     */
    updateGameModeIndicator() {
        const badge = document.getElementById('gameModeBadge');
        if (badge) {
            const modeIcon = badge.querySelector('.mode-icon');
            const modeText = badge.querySelector('.mode-text');
            
            // Remove all mode classes
            badge.classList.remove('normal', 'dark', 'crusader');
            
            if (GAME.state.gameMode === 'crusader') {
                badge.classList.add('crusader');
                if (modeIcon) modeIcon.textContent = '⚔️';
                if (modeText) modeText.textContent = 'CRUSADER';
            } else if (GAME.state.gameMode === 'dark' || GAME.state.darkMode) {
                badge.classList.add('dark');
                if (modeIcon) modeIcon.textContent = '🌑';
                if (modeText) modeText.textContent = 'DARK MODE';
            } else {
                badge.classList.add('normal');
                if (modeIcon) modeIcon.textContent = '☀️';
                if (modeText) modeText.textContent = 'NORMAL';
            }
        }
        // Update file integrity display if present
        try {
            const fiWrapper = document.getElementById('fileIntegrityDisplay');
            const fiPercent = document.getElementById('fileIntegrityPercent');
            const fiBtn = document.getElementById('restoreIntegrityBtn');
            if (fiWrapper && fiPercent) {
                const cur = (GAME && GAME.state && typeof GAME.state.fileIntegrityPercent === 'number') ? Math.max(0, Math.floor(GAME.state.fileIntegrityPercent)) : 100;
                fiPercent.textContent = cur + '%';
                fiWrapper.style.display = (GAME.state && GAME.state.gameMode === 'crusader') ? '' : 'none';
                if (cur < 15) {
                    fiPercent.classList.add('low');
                } else {
                    fiPercent.classList.remove('low');
                }
                if (fiBtn) {
                    fiBtn.style.display = (GAME.state && GAME.state.gameMode === 'crusader') ? '' : 'none';
                    // attach onclick safely (replace any previous)
                    fiBtn.onclick = () => {
                        // Attempt to restore 10% (very expensive)
                        try {
                            if (typeof GAME.payRestoreFileIntegrity === 'function') {
                                const ok = GAME.payRestoreFileIntegrity(10);
                                if (ok) {
                                    // update display
                                    this.updateGameModeIndicator();
                                }
                            }
                        } catch (e) { console.warn('restoreIntegrityBtn error', e); }
                    };
                }
            }
        } catch (e) { /* ignore UI update errors */ }
    },

    /**
     * Check and handle cookie consent
     */
    checkCookieConsent() {
        const cookieConsent = localStorage.getItem('cookieConsent');
        console.log('UI.checkCookieConsent: cookieConsent=', cookieConsent);
        const modal = document.getElementById('cookieConsentModal');
        
        // If no consent has been given, show the modal
        if (!cookieConsent) {
            modal.classList.remove('hidden');
            console.log('UI.checkCookieConsent: showing cookie modal');
            
            const acceptBtn = document.getElementById('acceptCookiesBtn');
            const declineBtn = document.getElementById('declineCookiesBtn');
            
            acceptBtn.addEventListener('click', () => {
                localStorage.setItem('cookieConsent', 'accepted');
                modal.classList.add('hidden');
                // After accepting cookies, check if we need to show game mode selection
                this.checkGameModeSelection();
            });
            
            declineBtn.addEventListener('click', () => {
                localStorage.setItem('cookieConsent', 'declined');
                modal.classList.add('hidden');
                alert('You have declined cookies. Game progress will not be saved.');
                // Still show game mode selection even if cookies declined
                this.checkGameModeSelection();
            });
        } else {
            // If consent has been given, hide the modal and check game mode
            modal.classList.add('hidden');
            console.log('UI.checkCookieConsent: hiding cookie modal');
            this.checkGameModeSelection();
        }
    },

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        console.log('UI.setupTabNavigation: found tabButtons=', tabButtons.length, 'tabContents=', tabContents.length);

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                
                // Check if tab is locked
                if (button.classList.contains('locked')) {
                    const unlockInfo = this.getTabUnlockInfo(tabName);
                    if (unlockInfo) {
                        alert(`🔒 ${unlockInfo.name}\n\nUnlock this in the Research tab for ${unlockInfo.cost} Skill Points.`);
                    }
                    return;
                }
                
                // Remove active class from all
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active to clicked
                button.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');
                console.log('UI.setupTabNavigation: activated tab', tabName);
                
                // Refresh tab-specific content
                if (tabName === 'achievements') {
                    this.renderDailyChallenges();
                }
                if (tabName === 'leaderboard') {
                    this.renderLeaderboard();
                    this.updatePersonalBests();
                }
                if (tabName === 'events') {
                    this.updateMinigameCooldowns();
                    this.updateMinigameHistory();
                }
                if (tabName === 'stats') {
                    this.updateStatsDisplay();
                }
                if (tabName === 'prestige') {
                    this.setupPrestigeTab();
                }
                if (tabName === 'fighting') {
                    this.setupFightingTab();
                }
            });
        });
        
        // Initial update of locked tabs
        this.updateLockedTabs();
    },
    
    /**
     * Get unlock info for a locked tab
     */
    getTabUnlockInfo(tabName) {
        const unlockMap = {
            'servers': { key: 'servers_tab_unlock', name: 'Server Infrastructure', cost: 5 },
            'casino': { key: 'casino_unlock', name: 'Casino License', cost: 25 }
        };
        return unlockMap[tabName] || null;
    },
    
    /**
     * Update locked state of tabs based on research
     */
    updateLockedTabs() {
        const lockedTabs = {
            'servers': 'servers_tab_unlock',
            'casino': 'casino_unlock'
        };
        
        for (const [tabName, researchKey] of Object.entries(lockedTabs)) {
            const tabButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
            if (!tabButton) continue;
            
            const isUnlocked = (GAME && GAME.state && GAME.state.unlockedResearch && typeof GAME.state.unlockedResearch.has === 'function') ? GAME.state.unlockedResearch.has(researchKey) : false;
            // debug: tab unlock state (removed noisy log)
            
            if (isUnlocked) {
                tabButton.classList.remove('locked');
                tabButton.querySelector('.lock-icon')?.remove();
            } else {
                tabButton.classList.add('locked');
                if (!tabButton.querySelector('.lock-icon')) {
                    const lockIcon = document.createElement('span');
                    lockIcon.className = 'lock-icon';
                    lockIcon.textContent = '🔒';
                    tabButton.appendChild(lockIcon);
                }
            }
        }
    },

    /**
     * Setup keyboard listeners for buy amount modifiers
     */
    setupBuyAmountKeyboardListeners() {
        const updateBuyAmount = () => {
            const shiftPressed = this.shiftPressed || false;
            const ctrlPressed = this.ctrlPressed || false;
            
            if (ctrlPressed && shiftPressed) {
                this.buyAmount = 'max';
            } else if (ctrlPressed) {
                this.buyAmount = 100;
            } else if (shiftPressed) {
                this.buyAmount = 10;
            } else {
                this.buyAmount = 1;
            }
            
            this.updateBuyAmountDisplay();
        };
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') this.shiftPressed = true;
            if (e.key === 'Control') this.ctrlPressed = true;
            updateBuyAmount();
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') this.shiftPressed = false;
            if (e.key === 'Control') this.ctrlPressed = false;
            updateBuyAmount();
        });
        
        // Reset on window blur
        window.addEventListener('blur', () => {
            this.shiftPressed = false;
            this.ctrlPressed = false;
            updateBuyAmount();
        });
    },
    
    /**
     * Update buy amount display on all upgrade buttons
     */
    updateBuyAmountDisplay() {
        const buyAmountText = this.buyAmount === 'max' ? 'MAX' : `x${this.buyAmount}`;
        
        // Update click upgrade buttons
        document.querySelectorAll('.upgrade-card .upgrade-button').forEach(btn => {
            if (!btn.classList.contains('battery-upgrade-btn') && !btn.classList.contains('gen-upgrade-btn')) {
                btn.textContent = `Buy ${buyAmountText}`;
            }
        });
        
        // Update battery upgrade buttons
        document.querySelectorAll('.battery-upgrade-btn').forEach(btn => {
            const key = btn.dataset.key;
            const methods = {
                'battery_capacity': () => GAME.getBatteryCapacityCost(),
                'battery_charge_rate': () => GAME.getBatteryChargeRateCost(),
                'battery_discharge_rate': () => GAME.getBatteryDischargeRateCost()
            };
            if (methods[key]) {
                const cost = methods[key]();
                btn.textContent = `${buyAmountText} - ${GAME.formatNumber(cost)}`;
            }
        });
        
        // Update generator upgrade buttons in power grid
        document.querySelectorAll('.gen-upgrade-btn').forEach(btn => {
            const genId = btn.dataset.id;
            if (genId) {
                const cost = GAME.getGeneratorUpgradeCost(genId) || 0;
                btn.textContent = `${buyAmountText} ${GAME.formatNumber(cost)}`;
            }
        });
        
        // Update all buy amount indicators
        const indicatorIds = ['buyAmountIndicator', 'buyAmountIndicatorPower', 'buyAmountIndicatorBattery'];
        indicatorIds.forEach(id => {
            const indicator = document.getElementById(id);
            if (indicator) {
                indicator.textContent = buyAmountText;
                indicator.className = 'buy-amount-indicator' + (this.buyAmount !== 1 ? ' active' : '');
            }
        });
    },

    /**
     * Setup clicker tab
     */
    setupClickerTab() {
        const coin = document.getElementById('clickCoin');
        console.log('UI.setupClickerTab: clickCoin present=', !!coin);
        coin.addEventListener('click', (e) => {
                try {
                e.preventDefault();
                e.stopPropagation();
                    console.log('clickCoin clicked; coins before:', GAME.state.coins);
                const clickPower = GAME.getClickPower();
                GAME.clickCoin();
                GAME.saveGame(); // Save immediately after click
                this.createClickAnimation(coin);
                this.createCoinParticle(clickPower); // Show floating text
                this.playSound('click'); // Play click sound
                // Quick update - only update balance and click value
                const balanceDisplay = document.getElementById('balanceDisplay');
                const clickValue = document.getElementById('clickValue');
                if (balanceDisplay) balanceDisplay.textContent = GAME.formatNumber(GAME.state.coins);
                if (clickValue) clickValue.textContent = '+' + GAME.formatNumber(GAME.getClickPower());
            } catch (error) {
                console.error('Click error:', error);
            }
        });

        coin.style.cursor = 'pointer';
    },

    /**
     * Create click animation on coin
     */
    createClickAnimation(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 50);
    },

    /**
     * Setup servers tab
     */
    setupServersTab() {
        const rackSection = document.getElementById('rackSection');
        const serversGrid = document.getElementById('serversGrid');
        
        // Only setup rack if it's empty, otherwise just update it
        let buildingSelector = document.getElementById('buildingSelectorContainer');
        if (!buildingSelector) {
            // Create building selector at the top
            const buildingSelectorContainer = document.createElement('div');
            buildingSelectorContainer.id = 'buildingSelectorContainer';
            buildingSelectorContainer.className = 'building-selector-container';
            buildingSelectorContainer.innerHTML = `
                <div class="building-selector-wrapper">
                    <label for="buildingSelect">Building:</label>
                    <select id="buildingSelect" class="building-select"></select>
                    <button id="buyBuildingBtn" class="buy-building-btn">Buy New Building</button>
                    <button id="deleteBuildingBtn" class="delete-building-btn">Sell Building</button>
                </div>
            `;
            rackSection.insertBefore(buildingSelectorContainer, rackSection.firstChild);
        }
        
        // Update building selector
        this.updateBuildingSelector();
        
        let rackContainer = rackSection.querySelector('.rack-container');
        if (!rackContainer) {
            rackContainer = document.createElement('div');
            rackContainer.className = 'rack-container';
            rackContainer.innerHTML = '<h3>Server Rack</h3>';
            
            const rackInfoDiv = document.createElement('div');
            rackInfoDiv.className = 'rack-info-section';
            
            // Rack capacity display
            const rackCapacity = document.createElement('div');
            rackCapacity.className = 'rack-capacity';
            rackCapacity.id = 'rackCapacity';
            rackInfoDiv.appendChild(rackCapacity);
            
            // Rack upgrade button
            const rackUpgradeBtnContainer = document.createElement('div');
            rackUpgradeBtnContainer.id = 'rackUpgradeBtnContainer';
            rackInfoDiv.appendChild(rackUpgradeBtnContainer);
            
            rackContainer.appendChild(rackInfoDiv);
            
            // Visual rack representation with cabinet-style layout
            const rackCabinetWrapper = document.createElement('div');
            rackCabinetWrapper.className = 'rack-cabinet-wrapper';
            
            // Add LED indicators on the left
            const rackLeds = document.createElement('div');
            rackLeds.className = 'rack-leds';
            
            // PWR LED Container
            const pwrLedContainer = document.createElement('div');
            pwrLedContainer.style.display = 'flex';
            pwrLedContainer.style.flexDirection = 'column';
            pwrLedContainer.style.alignItems = 'center';
            pwrLedContainer.style.gap = '5px';
            
            const pwrLed = document.createElement('div');
            pwrLed.className = `rack-led off`;
            pwrLed.id = `rack-led-0`;
            pwrLed.dataset.ledIndex = 0;
            
            const pwrLabel = document.createElement('div');
            pwrLabel.className = 'rack-led-label';
            pwrLabel.textContent = 'PWR';
            
            const wattageDisplay = document.createElement('div');
            wattageDisplay.id = 'rackWattageDisplay';
            wattageDisplay.style.fontSize = '11px';
            wattageDisplay.style.color = '#888888';
            wattageDisplay.style.textAlign = 'center';
            wattageDisplay.style.minWidth = '40px';
            wattageDisplay.textContent = '0W';
            
            const powerDownBtn = document.createElement('button');
            powerDownBtn.id = 'powerDownBtn';
            powerDownBtn.className = 'power-down-btn';
            powerDownBtn.textContent = 'Power Down';
            powerDownBtn.style.fontSize = '10px';
            powerDownBtn.style.padding = '4px 6px';
            powerDownBtn.style.marginTop = '5px';
            
            pwrLedContainer.appendChild(pwrLed);
            pwrLedContainer.appendChild(pwrLabel);
            pwrLedContainer.appendChild(wattageDisplay);
            pwrLedContainer.appendChild(powerDownBtn);
            rackLeds.appendChild(pwrLedContainer);
            
            // Add power down button event listener
            powerDownBtn.addEventListener('click', () => {
                GAME.toggleRackPower(GAME.state.currentBuildingId);
                this.updatePowerDisplay();
                this.renderRack();
            });
            
            rackCabinetWrapper.appendChild(rackLeds);
            
            // Main rack display
            const rackDisplay = document.createElement('div');
            rackDisplay.className = 'rack-display';
            rackDisplay.id = 'rackDisplay';
            rackCabinetWrapper.appendChild(rackDisplay);
            rackContainer.appendChild(rackCabinetWrapper);
            
            rackSection.appendChild(rackContainer);
            
            // Add server purchase cards only once
            if (serversGrid.children.length === 0) {
                for (const [key, config] of Object.entries(GAME.CONFIG.SERVERS)) {
                    this.createServerCard(key, config);
                }
            }
        }
        
        // Setup server tier dropdown
        this.setupServerTierDropdown();
        
        // Update rack info
        this.updateRackInfo();
        
        // Render rack visually
        this.renderRack();
    },

    /**
     * Setup server tier selector dropdown
     */
    setupServerTierDropdown() {
        const dropdown = document.getElementById('serverTierSelect');
        if (!dropdown) return;

        dropdown.innerHTML = '';
        
        // Get unique tiers and sort them
        const tiers = new Set();
        for (const config of Object.values(GAME.CONFIG.SERVERS)) {
            tiers.add(config.tier);
        }
        const sortedTiers = Array.from(tiers).sort((a, b) => a - b);
        
        // Add "All Tiers" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Tiers';
        allOption.selected = true;
        dropdown.appendChild(allOption);
        
        // Add each tier
        const tierNames = {
            1: 'Tier 1 - Budget',
            2: 'Tier 2 - Standard',
            3: 'Tier 3 - Advanced',
            4: 'Tier 4 - Datacenter',
            5: 'Tier 5 - AI Accelerated',
            6: 'Tier 6 - Exotic Servers'
        };
        
        for (const tier of sortedTiers) {
            const option = document.createElement('option');
            option.value = `tier_${tier}`;
            option.textContent = tierNames[tier] || `Tier ${tier}`;
            dropdown.appendChild(option);
        }
        
        // Handle dropdown change
        dropdown.onchange = (e) => {
            const selectedValue = e.target.value;
            this.filterServerCards(selectedValue);
        };
    },

    /**
     * Filter server cards by tier
     */
    filterServerCards(filterValue) {
        const cards = document.querySelectorAll('.server-card');
        cards.forEach(card => {
            if (filterValue === 'all') {
                card.style.display = '';
            } else {
                // Extract tier number from filter value (e.g., "tier_2" -> 2)
                const tierNum = parseInt(filterValue.split('_')[1]);
                const cardTier = parseInt(card.dataset.tier);
                card.style.display = cardTier === tierNum ? '' : 'none';
            }
        });
    },

    /**
     * Update building selector dropdown
     */
    updateBuildingSelector() {
        const select = document.getElementById('buildingSelect');
        if (!select) return;
        
        select.innerHTML = '';
        const buildings = GAME.getBuildings();
        buildings.forEach(building => {
            const option = document.createElement('option');
            option.value = building.id;
            option.textContent = `${building.name} - ${building.streetName}`;
            option.selected = building.id === GAME.state.currentBuildingId;
            select.appendChild(option);
        });
        
        // Handle building selection
        select.onchange = (e) => {
            GAME.switchBuilding(e.target.value);
            GAME.saveGame();
            this.updateRackInfo();
            this.renderRack();
        };
        
        // Update buy building button
        const buyBtn = document.getElementById('buyBuildingBtn');
        if (buyBtn) {
            const numBuildings = buildings.length;
            const maxBuildings = GAME.CONFIG.BUILDING_PURCHASE.maxBuildings;
            
            if (numBuildings >= maxBuildings) {
                buyBtn.disabled = true;
                buyBtn.innerHTML = 'Max Buildings Reached';
            } else {
                const cost = GAME.getBuildingPurchaseCost();
                const canAfford = GAME.state.coins >= cost;
                buyBtn.disabled = !canAfford;
                buyBtn.innerHTML = `Buy Building (${GAME.formatNumber(cost)})`;
                
                buyBtn.onclick = () => {
                    if (GAME.buyBuilding()) {
                        GAME.saveGame();
                        this.updateBuildingSelector();
                        this.updateRackInfo();
                        this.renderRack();
                    }
                };
            }
        }

        // Setup delete building button
        const deleteBtn = document.getElementById('deleteBuildingBtn');
        if (deleteBtn) {
            const currentBuilding = GAME.getCurrentBuilding();
            // Can't delete the default headquarters or Space Station
            if (currentBuilding && currentBuilding.isDefault) {
                deleteBtn.disabled = true;
                deleteBtn.title = 'Cannot sell the headquarters';
            } else if (currentBuilding && currentBuilding.isSpaceStation) {
                deleteBtn.disabled = true;
                deleteBtn.title = 'Cannot sell the Space Station';
            } else {
                deleteBtn.disabled = false;
                deleteBtn.onclick = () => {
                    this.showDeleteBuildingModal();
                };
            }
        }
    },
    
    /**
     * Show delete building confirmation modal
     */
    showDeleteBuildingModal() {
        const modal = document.getElementById('deleteBuildingModal');
        const currentBuilding = GAME.getCurrentBuilding();
        if (!modal || !currentBuilding) return;
        
        const warningElement = document.getElementById('buildingUpgradeWarning');
        const messageElement = document.getElementById('deleteBuildingMessage');
        
        // Check if building has upgrades
        const hasUpgrades = currentBuilding.maxRackUnits > 1;
        
        if (warningElement) {
            warningElement.style.display = hasUpgrades ? 'block' : 'none';
        }
        
        if (messageElement) {
            messageElement.textContent = `Are you sure you want to sell "${currentBuilding.name} - ${currentBuilding.streetName}"?`;
        }
        
        modal.classList.remove('hidden');
    },
    
    /**
     * Update rack info and buttons
     */
    updateRackInfo() {
        const maxRackUnits = GAME.getMaxRackUnits();
        const usedRackUnits = GAME.getUsedRackUnits();
        const building = GAME.getCurrentBuilding();
        const buildingId = GAME.state.currentBuildingId;
        
        const rackCapacity = document.getElementById('rackCapacity');
        if (rackCapacity) {
            rackCapacity.innerHTML = `<span>${usedRackUnits}U / ${maxRackUnits}U</span>`;
        }
        
        // Update corruption display
        this.updateCorruptionDisplay(buildingId);
        
        const rackUpgradeBtnContainer = document.getElementById('rackUpgradeBtnContainer');
        if (rackUpgradeBtnContainer) {
            rackUpgradeBtnContainer.innerHTML = '';
            
            if (maxRackUnits < 6) {
                const rackUpgradeBtn = document.createElement('button');
                rackUpgradeBtn.className = 'rack-upgrade-btn';
                const rackCost = GAME.getRackUpgradeCost();
                const canAfford = GAME.state.coins >= rackCost;
                rackUpgradeBtn.style.opacity = canAfford ? '1' : '0.5';
                rackUpgradeBtn.innerHTML = `Add 1U (${GAME.formatNumber(rackCost)})`;
                rackUpgradeBtn.addEventListener('click', () => {
                    if (GAME.buyRackUpgrade()) {
                        GAME.saveGame();
                        this.updateRackInfo();
                        this.renderRack();
                    }
                });
                rackUpgradeBtnContainer.appendChild(rackUpgradeBtn);
            } else {
                const maxLabel = document.createElement('div');
                maxLabel.style.color = '#FFD700';
                maxLabel.textContent = 'Rack Capacity: Maximum';
                rackUpgradeBtnContainer.appendChild(maxLabel);
            }
        }
    },

    /**
     * Update corruption display for current building
     */
    updateCorruptionDisplay(buildingId) {
        let corruptionContainer = document.getElementById('corruptionContainer');
        
        // Create container if it doesn't exist
        if (!corruptionContainer) {
            const rackInfoSection = document.querySelector('.rack-info-section');
            if (!rackInfoSection) return;
            
            corruptionContainer = document.createElement('div');
            corruptionContainer.id = 'corruptionContainer';
            corruptionContainer.className = 'corruption-container';
            rackInfoSection.appendChild(corruptionContainer);
        }
        
        const corruption = GAME.getBuildingCorruption(buildingId);
        const repairCost = GAME.getRepairCost(buildingId);
        const canAfford = GAME.state.coins >= repairCost;
        const autoRepairLevel = GAME.state.ascensionUpgrades?.autorepair || 0;
        
        // Determine corruption status color
        let statusColor = '#4ade80'; // Green
        let statusText = 'Optimal';
        if (corruption >= 75) {
            statusColor = '#ef4444'; // Red
            statusText = 'Critical';
        } else if (corruption >= 50) {
            statusColor = '#f97316'; // Orange
            statusText = 'Degraded';
        } else if (corruption >= 25) {
            statusColor = '#eab308'; // Yellow
            statusText = 'Warning';
        }
        
        const penaltyPercent = Math.round(corruption * 0.5);
        
        corruptionContainer.innerHTML = `
            <div class="corruption-header">
                <span class="corruption-title">🔧 Server Health</span>
                ${autoRepairLevel > 0 ? '<span class="auto-repair-badge">AUTO-REPAIR</span>' : ''}
            </div>
            <div class="corruption-bar-container">
                <div class="corruption-bar" style="width: ${100 - corruption}%; background: ${statusColor};"></div>
            </div>
            <div class="corruption-info">
                <span class="corruption-status" style="color: ${statusColor};">${statusText} (${Math.round(100 - corruption)}%)</span>
                ${corruption > 0 ? `<span class="corruption-penalty">-${penaltyPercent}% production</span>` : ''}
            </div>
            ${corruption > 5 && autoRepairLevel === 0 ? `
                <button class="repair-btn ${canAfford ? '' : 'disabled'}" id="repairBtn">
                    🔧 Repair (${GAME.formatNumber(repairCost)})
                </button>
            ` : ''}
        `;
        
        // Add repair button event listener
        const repairBtn = document.getElementById('repairBtn');
        if (repairBtn) {
            repairBtn.addEventListener('click', () => {
                if (GAME.repairServerCorruption(buildingId)) {
                    this.updateRackInfo();
                    this.updateDisplay();
                }
            });
        }
    },

    /**
     * Render the server rack visualization
     */
    renderRack() {
        const rackDisplay = document.getElementById('rackDisplay');
        if (!rackDisplay) return;
        
        rackDisplay.innerHTML = '';
        const building = GAME.getCurrentBuilding();
        if (!building) return;
        
        // Check if this is a Space Station (3 racks side by side)
        if (building.isSpaceStation) {
            this.renderSpaceStationRacks(rackDisplay, building);
            return;
        }
        
        const maxRackUnits = building.maxRackUnits;
        
        // Create container for rack units
        const rackUnitsContainer = document.createElement('div');
        rackUnitsContainer.className = 'rack-units';
        
        // Track which units are occupied
        const usedUnits = new Set();
        const serversByUnit = {};
        
        // Map servers to their units
        for (const server of building.placedServers) {
            const config = GAME.CONFIG.SERVERS[server.type];
            
            // Skip if config doesn't exist for this server type
            if (!config) {
                console.warn(`Unknown server type: ${server.type}. Server data:`, server);
                // Try to recover by guessing type from serverId
                console.warn('Attempting recovery...');
                continue;
            }
            
            let startUnit = 0;
            
            // Find first available unit
            for (let u = 0; u < maxRackUnits; u++) {
                if (!usedUnits.has(u)) {
                    startUnit = u;
                    break;
                }
            }
            
            // Mark units as used and store server info
            for (let i = 0; i < config.rackUnits; i++) {
                usedUnits.add(startUnit + i);
                if (i === 0) {
                    serversByUnit[startUnit] = { server, config, span: config.rackUnits };
                }
            }
        }
        
        // Create a set of continuation units (units that are part of a multi-unit server but not the starting unit)
        const continuationUnits = new Set();
        for (let unit = 0; unit < maxRackUnits; unit++) {
            if (usedUnits.has(unit) && !serversByUnit[unit]) {
                continuationUnits.add(unit);
            }
        }
        
        // Create rack unit rows
        let unitIndex = 0;
        while (unitIndex < maxRackUnits) {
            if (serversByUnit[unitIndex]) {
                const { server, config, span } = serversByUnit[unitIndex];
                
                // Create server display
                const unit = document.createElement('div');
                unit.className = 'rack-unit';
                unit.style.gridTemplateColumns = '30px 1fr';
                
                const label = document.createElement('div');
                label.className = 'rack-unit-label';
                label.textContent = `${span}U`;
                
                const serverElement = document.createElement('div');
                serverElement.className = 'rack-server';
                serverElement.setAttribute('data-server-id', server.serverId);
                serverElement.style.height = `${span * 65 + (span - 1) * 0}px`;
                
                // Apply disabled appearance if power is critical or rack is powered down
                const isPowerCritical = GAME.isPowerCritical() || GAME.isRackPoweredDown();
                if (isPowerCritical) {
                    serverElement.style.opacity = '0.5';
                    serverElement.style.filter = 'grayscale(0.8)';
                }
                
                // Calculate hash rate for this server type
                const baseHashRate = config.baseProduction * 1000; // Convert to hashes/second
                const workerMultiplier = server.hasWorker ? 1.5 : 1.0; // 50% boost with worker
                const actualHashRate = baseHashRate * workerMultiplier;
                const hashRateStr = GAME.formatHashRate(actualHashRate);
                
                // Get mining progress (ensure it's a valid number)
                const miningProgress = Math.round(server.miningProgress || 0);
                const blockData = server.currentBlock;
                const blockRarity = blockData?.rarity || GAME.CONFIG.LUCKY_BLOCKS.common;
                const blockName = blockData?.name || GAME.generateBlockName();
                const blockIcon = blockRarity.icon || '⬜';
                const blockColor = blockRarity.color || '#888888';
                
                // Calculate adjusted progress based on mining time multiplier
                const adjustedProgress = Math.round(miningProgress / (blockData?.miningTimeMultiplier || 1.0));
                
                serverElement.innerHTML = `
                    <div class="rack-server-icon">${config.icon}</div>
                    <div class="rack-server-info">
                        <div class="rack-server-header">
                            <div class="rack-server-name">${config.name} <span class="rack-server-leds-inline"><div class="led rx-led"></div><div class="led tx-led"></div></span></div>
                        </div>
                        <div class="rack-server-mining">
                            <div class="mining-text" style="color: ${blockColor}; font-weight: bold;">
                                ${blockIcon} ${blockRarity.name}: ${blockName}
                            </div>
                            <div class="mining-progress-bar">
                                <div class="mining-progress-fill" style="width: ${miningProgress}%; background-color: ${blockColor}"></div>
                                <div class="mining-percentage">${miningProgress}%</div>
                            </div>
                        </div>
                    </div>
                    <div class="rack-server-controls">
                        <button class="worker-btn" data-server-id="${server.serverId}" ${server.hasWorker ? 'disabled' : ''}>
                            ${server.hasWorker ? '✓ Worker' : `Hire (${GAME.formatNumber(GAME.getWorkerCost(server.serverId))})`}
                        </button>
                        <div class="rack-server-hashrate">${hashRateStr}</div>
                    </div>
                `;
                
                // Initialize LED blinking animation with data attributes for tracking
                const rxLed = serverElement.querySelector('.rx-led');
                const txLed = serverElement.querySelector('.tx-led');
                
                // Store random blink timing in data attributes
                rxLed.dataset.lastBlink = Date.now();
                rxLed.dataset.blinkInterval = Math.random() * 200 + 100;
                txLed.dataset.lastBlink = Date.now();
                txLed.dataset.blinkInterval = Math.random() * 250 + 150;
                
                // Initial state - will be updated in updateMiningProgressBars
                
                serverElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    const serverConfig = GAME.CONFIG.SERVERS[server.type];
                    if (!serverConfig) {
                        console.error('Server config is missing!', server);
                        alert('Error: Server configuration not found');
                        return;
                    }
                    
                    // Left click - sell/remove server
                    if (e.button === 0) {
                        // Calculate refund
                        const fullCost = GAME.getServerCost(server.type);
                        const refund = Math.floor(fullCost * 0.75);
                        
                        // Check if server has a worker
                        const hasWorker = server.hasWorker;
                        
                        // Show warning modal if has worker, otherwise use simple confirm
                        if (hasWorker) {
                            this.showSellServerModal(server, serverConfig, refund);
                        } else {
                            if (confirm(`Remove ${serverConfig.name} from rack and refund ${GAME.formatNumber(refund)} coins?`)) {
                                // Get current balance before any modifications
                                const currentBalance = GAME.state.coins || 0;
                                const newBalance = currentBalance + refund;
                                
                                // Remove server from rack
                                GAME.removeServerFromRack(server.serverId);
                                
                                // Set the new balance explicitly
                                GAME.state.coins = newBalance;
                                
                                // Save immediately
                                GAME.saveGame();
                                
                                // Update rack display without recreating building selector
                                this.updateRackInfo();
                                this.renderRack();
                                
                                // Update display through proper UI update method
                                this.updateDisplay();
                            }
                        }
                    }
                });
                
                serverElement.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    // Context menu disabled - use left click to sell
                });
                
                // Add worker button event listener
                const workerBtn = serverElement.querySelector('.worker-btn');
                if (workerBtn) {
                    workerBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent click from triggering server click
                        if (!server.hasWorker && GAME.state.coins >= GAME.getWorkerCost(server.serverId)) {
                            if (GAME.buyWorker(server.serverId)) {
                                GAME.saveGame();
                                this.renderRack();
                            }
                        }
                    });
                    
                    // Update button state based on affordability
                    const workerCost = GAME.getWorkerCost(server.serverId);
                    workerBtn.style.opacity = (GAME.state.coins >= workerCost && !server.hasWorker) ? '1' : '0.5';
                }
                
                unit.appendChild(label);
                unit.appendChild(serverElement);
                rackUnitsContainer.appendChild(unit);
                
                // Skip spanned units
                unitIndex += span;
            } else if (continuationUnits.has(unitIndex)) {
                // Skip continuation units (they're already visually part of a multi-unit server above)
                unitIndex += 1;
            } else {
                // Create empty slot
                const unit = document.createElement('div');
                unit.className = 'rack-unit empty';
                
                const label = document.createElement('div');
                label.className = 'rack-unit-label';
                label.textContent = `${unitIndex + 1}U`;
                
                const content = document.createElement('div');
                content.className = 'rack-unit-content';
                
                unit.appendChild(label);
                unit.appendChild(content);
                rackUnitsContainer.appendChild(unit);
                
                unitIndex += 1;
            }
        }
        
        rackDisplay.appendChild(rackUnitsContainer);
    },

    /**
     * Render Space Station with 3 racks side by side
     */
    renderSpaceStationRacks(rackDisplay, building) {
        const unitsPerRack = 6; // Each rack has 6U
        const rackCount = building.rackCount || 3;
        
        // Space Station header with efficiency bonus
        const header = document.createElement('div');
        header.className = 'space-station-header';
        header.innerHTML = `
            <div class="station-title">🚀 Space Station - Orbital Platform Alpha</div>
            <div class="station-bonus">❄️ Cold Space Environment: <span class="bonus-value">+50% Server Efficiency</span></div>
        `;
        rackDisplay.appendChild(header);
        
        // Container for 3 racks side by side
        const racksContainer = document.createElement('div');
        racksContainer.className = 'space-station-racks';
        
        // Track which units are occupied
        const usedUnits = new Set();
        const serversByUnit = {};
        
        // Map servers to their units
        for (const server of building.placedServers) {
            const config = GAME.CONFIG.SERVERS[server.type];
            if (!config) continue;
            
            let startUnit = 0;
            for (let u = 0; u < building.maxRackUnits; u++) {
                if (!usedUnits.has(u)) {
                    startUnit = u;
                    break;
                }
            }
            
            for (let i = 0; i < config.rackUnits; i++) {
                usedUnits.add(startUnit + i);
                if (i === 0) {
                    serversByUnit[startUnit] = { server, config, span: config.rackUnits };
                }
            }
        }
        
        const continuationUnits = new Set();
        for (let unit = 0; unit < building.maxRackUnits; unit++) {
            if (usedUnits.has(unit) && !serversByUnit[unit]) {
                continuationUnits.add(unit);
            }
        }
        
        // Create 3 rack columns
        for (let rackNum = 0; rackNum < rackCount; rackNum++) {
            const rackColumn = document.createElement('div');
            rackColumn.className = 'station-rack-column';
            
            const rackHeader = document.createElement('div');
            rackHeader.className = 'rack-column-header';
            rackHeader.innerHTML = `<span>Rack ${rackNum + 1}</span>`;
            rackColumn.appendChild(rackHeader);
            
            const rackUnitsContainer = document.createElement('div');
            rackUnitsContainer.className = 'rack-units station-rack-units';
            
            const startUnit = rackNum * unitsPerRack;
            const endUnit = startUnit + unitsPerRack;
            
            let unitIndex = startUnit;
            while (unitIndex < endUnit) {
                if (serversByUnit[unitIndex]) {
                    const { server, config, span } = serversByUnit[unitIndex];
                    
                    const unit = document.createElement('div');
                    unit.className = 'rack-unit';
                    
                    const label = document.createElement('div');
                    label.className = 'rack-unit-label';
                    label.textContent = `${span}U`;
                    
                    const serverElement = document.createElement('div');
                    serverElement.className = 'rack-server space-station-server';
                    serverElement.setAttribute('data-server-id', server.serverId);
                    serverElement.style.height = `${span * 65 + (span - 1) * 0}px`;
                    
                    const isPowerCritical = GAME.isPowerCritical() || GAME.isRackPoweredDown();
                    if (isPowerCritical) {
                        serverElement.style.opacity = '0.5';
                        serverElement.style.filter = 'grayscale(0.8)';
                    }
                    
                    const baseHashRate = config.baseProduction * 1000;
                    const workerMultiplier = server.hasWorker ? 1.5 : 1.0;
                    const efficiencyBonus = 1.5; // 50% bonus
                    const actualHashRate = baseHashRate * workerMultiplier * efficiencyBonus;
                    const hashRateStr = GAME.formatHashRate(actualHashRate);
                    
                    const miningProgress = Math.round(server.miningProgress || 0);
                    const blockData = server.currentBlock;
                    const blockRarity = blockData?.rarity || GAME.CONFIG.LUCKY_BLOCKS.common;
                    const blockName = blockData?.name || GAME.generateBlockName();
                    const blockIcon = blockRarity.icon || '⬜';
                    const blockColor = blockRarity.color || '#888888';
                    
                    serverElement.innerHTML = `
                        <div class="rack-server-icon">${config.icon}</div>
                        <div class="rack-server-info">
                            <div class="rack-server-header">
                                <div class="rack-server-name">${config.name} <span class="efficiency-badge">+50%</span></div>
                            </div>
                            <div class="rack-server-mining">
                                <div class="mining-text" style="color: ${blockColor}; font-weight: bold;">
                                    ${blockIcon} ${blockRarity.name}: ${blockName}
                                </div>
                                <div class="mining-progress-bar">
                                    <div class="mining-progress-fill" style="width: ${miningProgress}%; background-color: ${blockColor}"></div>
                                    <div class="mining-percentage">${miningProgress}%</div>
                                </div>
                            </div>
                            <div class="rack-server-stats">
                                <span class="stat">⚡ ${hashRateStr}</span>
                                <span class="stat">🔌 ${config.powerDraw}W</span>
                            </div>
                        </div>
                        <div class="rack-server-actions">
                            <button class="rack-action-btn sell-btn" data-action="sell" data-server-id="${server.serverId}" title="Sell Server">💰</button>
                            <button class="rack-action-btn power-btn" data-action="power" data-server-id="${server.serverId}" title="Power Toggle">⚡</button>
                        </div>
                    `;
                    
                    // Event handlers for sell/power buttons
                    serverElement.querySelector('.sell-btn').onclick = (e) => {
                        e.stopPropagation();
                        if (confirm(`Sell ${config.name} for ${GAME.formatNumber(Math.floor(GAME.getServerCost(server.type) * 0.5))} coins?`)) {
                            GAME.removeServerFromRack(server.serverId);
                            GAME.saveGame();
                            this.renderRack();
                            this.updateDisplay();
                        }
                    };
                    
                    unit.appendChild(label);
                    unit.appendChild(serverElement);
                    rackUnitsContainer.appendChild(unit);
                    
                    unitIndex += span;
                } else if (continuationUnits.has(unitIndex)) {
                    unitIndex += 1;
                } else {
                    const unit = document.createElement('div');
                    unit.className = 'rack-unit empty';
                    
                    const label = document.createElement('div');
                    label.className = 'rack-unit-label';
                    label.textContent = `${(unitIndex % unitsPerRack) + 1}U`;
                    
                    const content = document.createElement('div');
                    content.className = 'rack-unit-content station-empty-slot';
                    content.innerHTML = '❄️';
                    
                    unit.appendChild(label);
                    unit.appendChild(content);
                    rackUnitsContainer.appendChild(unit);
                    
                    unitIndex += 1;
                }
            }
            
            rackColumn.appendChild(rackUnitsContainer);
            racksContainer.appendChild(rackColumn);
        }
        
        rackDisplay.appendChild(racksContainer);
    },

    /**
     * Create a single server card
     */
    createServerCard(key, config) {
        const container = document.getElementById('serversGrid');
        const cost = GAME.getServerCost(key);
        const card = document.createElement('div');
        card.className = 'server-card';
        card.dataset.serverKey = key;
        card.dataset.tier = config.tier;

        card.id = `server-card-${key}`;
        card.innerHTML = `
            <div class="server-header">
                <span class="server-icon">${config.icon}</span>
                <div class="server-title-info">
                    <h3>${config.name}</h3>
                    <span class="cpu-brand">${config.cpu}</span>
                </div>
            </div>
            <div class="server-specs">
                <div class="spec-item">
                    <span class="spec-label">RAM:</span>
                    <span class="spec-value">${config.ram}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Hash Rate:</span>
                    <span class="spec-value">${GAME.formatNumber(config.baseHashRate)} H/s</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Power Draw:</span>
                    <span class="spec-value">${config.powerDraw} W</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Rack Units:</span>
                    <span class="spec-value">${config.rackUnits}U</span>
                </div>
            </div>
            <div class="server-production">
                <span class="production-label">Owned:</span>
                <span class="production-value server-count-${key}">0</span>
            </div>
            <div class="server-total-hashrate">
                <span class="hashrate-label">Total H/s:</span>
                <span class="hashrate-value server-hashrate-${key}">0 H/s</span>
            </div>
            ${config.materialCost ? `<div class="server-materials" id="materials-${key}"></div>` : ''}
            <button class="buy-button" id="buy-btn-${key}" data-server="${key}">Place in Rack</button>
        `;
        
        // Setup button event for placement
        const placeBtn = card.querySelector(`[data-server="${key}"]`);
        const updateButtonState = () => {
            const cost = GAME.getServerCost(key);
            const available = GAME.getAvailableRackUnits();
            const required = config.rackUnits;
            const hasMaterials = !config.materialCost || this.hasEnoughMaterials(key);
            const canPlace = GAME.state.coins >= cost && available >= required && hasMaterials;
            placeBtn.disabled = !canPlace;
            placeBtn.textContent = `Place in Rack (${GAME.formatNumber(cost)})`;
            
            // Update materials display
            if (config.materialCost) {
                const materialsEl = document.getElementById(`materials-${key}`);
                if (materialsEl) {
                    materialsEl.innerHTML = `<span class="materials-label">Materials:</span> ${this.getMaterialRequirementsText(key)}`;
                }
            }
            
            if (available < required) {
                placeBtn.title = `Requires ${required}U but only ${available}U available`;
            } else {
                placeBtn.title = '';
            }
        };
        
        placeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Check if server type requires research
            if (config.requiresResearch && !GAME.isResearchUnlocked(config.requiresResearch)) {
                alert(`${config.name} has not been researched yet!\n\nVisit the Research tab to unlock this server type.`);
                return;
            }
            
            const available = GAME.getAvailableRackUnits();
            const required = config.rackUnits;
            
            if (available < required) {
                alert(`Not enough rack space! Requires ${required}U but only ${available}U available.`);
                return;
            }
            
            if (GAME.state.coins < cost) {
                alert('Not enough coins!');
                return;
            }
            
            // Place server in rack using the game method
            if (GAME.placeServerInRack(key)) {
                GAME.saveGame();
                
                // Only update the rack display, not the entire tab
                this.updateRackInfo();
                this.renderRack();
                
                // Update balance in header
                document.getElementById('balanceDisplay').textContent = GAME.formatNumber(GAME.state.coins);
                document.getElementById('epsDisplay').textContent = GAME.formatHashRate(GAME.getHashRate());
            }
        });

        container.appendChild(card);
        
        // Update button state on render
        updateButtonState();
    },

    /**
     * Setup power tab
     */
    setupPowerTab() {
        const buttonContainer = document.getElementById('generatorButtons');
        buttonContainer.innerHTML = '';

        // Add grid slot upgrade button at the top
        const maxSlots = GAME.getMaxGridSlots();
        if (maxSlots < 25) {
            const gridUpgradeBtn = document.createElement('button');
            gridUpgradeBtn.className = 'generator-button grid-upgrade-btn';
            const cost = GAME.getGridSlotUpgradeCost();
            const canAfford = GAME.state.coins >= cost;
            gridUpgradeBtn.style.opacity = canAfford ? '1' : '0.5';
            gridUpgradeBtn.innerHTML = `
                <span class="gen-emoji">📦</span>
                <span class="gen-name">Grid Slot</span>
                <span class="gen-cost">${GAME.formatNumber(cost)}</span>
                <span class="gen-power">${maxSlots}/${25}</span>
            `;
            gridUpgradeBtn.addEventListener('click', () => {
                if (GAME.buyGridSlotUpgrade()) {
                    GAME.saveGame();
                    this.updatePowerDisplay();
                }
            });
            buttonContainer.appendChild(gridUpgradeBtn);
        }

        // Determine which generators to show
        const shownGenerators = new Set();
        
        // First, add all unlocked generators
        for (const [key, config] of Object.entries(GAME.CONFIG.GENERATORS)) {
            if (!config.requiresResearch || GAME.isResearchUnlocked(config.requiresResearch)) {
                shownGenerators.add(key);
            }
        }
        
        // Then, add the next unlockable generator (one from each tier level that isn't unlocked yet)
        const unlockedResearch = GAME.state.unlockedResearch;
        const unlockedTiers = new Set();
        
        // Find which tiers are unlocked
        for (const [key, config] of Object.entries(GAME.CONFIG.GENERATORS)) {
            if (!config.requiresResearch || GAME.isResearchUnlocked(config.requiresResearch)) {
                unlockedTiers.add(config.tier);
            }
        }
        
        // For each unlocked tier, find the next generator in the next tier and show it
        for (let tier = 1; tier <= 3; tier++) {
            if (unlockedTiers.has(tier)) {
                // Find first non-unlocked generator in tier+1
                for (const [key, config] of Object.entries(GAME.CONFIG.GENERATORS)) {
                    if (config.tier === tier + 1 && !shownGenerators.has(key) && config.requiresResearch) {
                        shownGenerators.add(key);
                        break; // Only show one per next tier
                    }
                }
            }
        }

        // If no tier 1 is unlocked, show tier 1 options
        if (!unlockedTiers.has(1)) {
            for (const [key, config] of Object.entries(GAME.CONFIG.GENERATORS)) {
                if (config.tier === 1 && config.requiresResearch) {
                    shownGenerators.add(key);
                }
            }
        }

        // Create buttons for shown generators
        for (const [key, config] of Object.entries(GAME.CONFIG.GENERATORS)) {
            if (!shownGenerators.has(key)) {
                continue;
            }

            const isResearched = !config.requiresResearch || GAME.isResearchUnlocked(config.requiresResearch);
            const button = document.createElement('button');
            button.className = 'generator-button';
            
            let costDisplay = GAME.formatNumber(config.cost);
            let powerDisplay = GAME.formatNumber(GAME.getGeneratorPower(key)) + ' ⚡';
            let warningHTML = '';
            
            if (!isResearched) {
                warningHTML = '<span class="gen-warning">⚠️ NOT RESEARCHED</span>';
                button.style.opacity = '0.5';
                button.disabled = true;
            }
            
            button.innerHTML = `
                <span class="gen-emoji">${config.emoji}</span>
                <span class="gen-name">${config.name}</span>
                <span class="gen-cost">${costDisplay}</span>
                <span class="gen-power">${powerDisplay}</span>
                ${warningHTML}
            `;
            
            if (isResearched) {
                button.addEventListener('click', () => {
                    if (GAME.placeGenerator(key)) {
                        // Save immediately after purchase
                        GAME.saveGame();
                        this.updatePowerDisplay();
                    }
                });
            } else {
                button.addEventListener('click', () => {
                    alert(`${config.name} has not been researched yet!\n\nVisit the Research tab to unlock this generator.`);
                });
            }
            
            buttonContainer.appendChild(button);
        }

        // Setup power grid
        this.renderPowerGrid();
        
        // Setup grid click listeners with event delegation
        const grid = document.getElementById('powerGrid');
        if (!grid.dataset.listenersAttached) {
            grid.addEventListener('click', (e) => {
                // Handle upgrade button clicks via event delegation
                if (e.target.classList.contains('gen-upgrade-btn')) {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    const genId = e.target.dataset.id;
                    if (!genId) return;
                    
                    let purchaseCount = 0;
                    const targetAmount = this.buyAmount === 'max' ? 1000 : this.buyAmount;
                    
                    for (let i = 0; i < targetAmount; i++) {
                        if (GAME.upgradeGenerator(genId)) {
                            purchaseCount++;
                        } else {
                            break;
                        }
                    }
                    
                    if (purchaseCount > 0) {
                        GAME.saveGame();
                        this.updatePowerDisplay();
                    }
                    return;
                }
                
                // Find the grid-slot, whether we clicked on it or its children
                let slot = e.target;
                while (slot && !slot.classList.contains('grid-slot')) {
                    slot = slot.parentElement;
                }
                
                if (slot) {
                    const index = parseInt(slot.dataset.index);
                    const generator = GAME.state.powerGenerators[index];
                    if (generator) {
                        const config = GAME.CONFIG.GENERATORS[generator.type];
                        const refundAmount = Math.floor(config.cost * 0.75);
                        
                        // Check if generator has upgrades
                        const hasUpgrades = GAME.state.generatorUpgrades[generator.id] && GAME.state.generatorUpgrades[generator.id] > 0;
                        
                        // Show warning modal if has upgrades, otherwise use simple confirm
                        if (hasUpgrades) {
                            this.showSellGeneratorModal(generator, config, refundAmount);
                        } else {
                            if (confirm(`Sell ${config.name} for ${GAME.formatNumber(refundAmount)} coins?`)) {
                                GAME.removeGenerator(generator.id);
                                GAME.state.coins += refundAmount;
                                GAME.saveGame();
                                this.updatePowerDisplay();
                            }
                        }
                    }
                }
            });
            grid.dataset.listenersAttached = true;
        }
    },

    /**
     * Show modal to confirm selling an upgraded generator
     */
    showSellGeneratorModal(generator, config, refundAmount) {
        const modal = document.getElementById('sellGeneratorModal');
        const messageElement = document.getElementById('sellGeneratorMessage');
        const warningElement = document.getElementById('generatorUpgradeWarning');
        const confirmBtn = document.getElementById('confirmSellGeneratorBtn');
        const cancelBtn = document.getElementById('cancelSellGeneratorBtn');
        
        if (!modal || !confirmBtn || !cancelBtn) {
            // Fallback if modal doesn't exist
            if (confirm(`Sell ${config.name} for ${GAME.formatNumber(refundAmount)} coins?\n\n⚠️ WARNING: All upgrades will be lost!`)) {
                GAME.removeGenerator(generator.id);
                GAME.state.coins += refundAmount;
                GAME.saveGame();
                this.updatePowerDisplay();
            }
            return;
        }
        
        // Update modal message
        if (messageElement) {
            messageElement.textContent = `Are you sure you want to sell the ${config.name}?`;
        }
        
        // Show warning
        if (warningElement) {
            warningElement.style.display = 'block';
        }
        
        // Add refund info
        const refundElement = document.getElementById('generatorRefundInfo');
        if (refundElement) {
            refundElement.textContent = `You will receive ${GAME.formatNumber(refundAmount)} coins.`;
        }
        
        // Clear old listeners by replacing button
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new listener
        newConfirmBtn.addEventListener('click', () => {
            GAME.removeGenerator(generator.id);
            GAME.state.coins += refundAmount;
            GAME.saveGame();
            this.updatePowerDisplay();
            modal.classList.add('hidden');
        });
        
        // Cancel button
        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
        };
        
        // Show modal
        modal.classList.remove('hidden');
    },

    /**
     * Show modal to confirm selling a server with worker
     */
    showSellServerModal(server, config, refund) {
        const modal = document.getElementById('sellServerModal');
        const messageElement = document.getElementById('sellServerMessage');
        const warningElement = document.getElementById('serverWorkerWarning');
        const confirmBtn = document.getElementById('confirmSellServerBtn');
        const cancelBtn = document.getElementById('cancelSellServerBtn');
        
        if (!modal || !confirmBtn || !cancelBtn) {
            // Fallback if modal doesn't exist
            if (confirm(`Remove ${config.name} from rack and refund ${GAME.formatNumber(refund)} coins?\n\n⚠️ WARNING: The hired worker will be lost!`)) {
                const currentBalance = GAME.state.coins || 0;
                GAME.removeServerFromRack(server.serverId);
                GAME.state.coins = currentBalance + refund;
                GAME.saveGame();
                this.updateRackInfo();
                this.renderRack();
                this.updateDisplay();
            }
            return;
        }
        
        // Update modal message
        if (messageElement) {
            messageElement.textContent = `Are you sure you want to sell the ${config.name}?`;
        }
        
        // Show warning
        if (warningElement) {
            warningElement.style.display = 'block';
        }
        
        // Add refund info
        const refundElement = document.getElementById('serverRefundInfo');
        if (refundElement) {
            refundElement.textContent = `You will receive ${GAME.formatNumber(refund)} coins.`;
        }
        
        // Clear old listeners by replacing button
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new listener
        newConfirmBtn.addEventListener('click', () => {
            const currentBalance = GAME.state.coins || 0;
            GAME.removeServerFromRack(server.serverId);
            GAME.state.coins = currentBalance + refund;
            GAME.saveGame();
            this.updateRackInfo();
            this.renderRack();
            this.updateDisplay();
            modal.classList.add('hidden');
        });
        
        // Cancel button
        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
        };
        
        // Show modal
        modal.classList.remove('hidden');
    },

    /**
     * Render power grid
     */
    renderPowerGrid() {
        const grid = document.getElementById('powerGrid');
        const maxSlots = GAME.getMaxGridSlots();
        
        // Create or remove slots to match max slots
        const currentSlots = grid.children.length;
        if (currentSlots < maxSlots) {
            // Add new slots
            for (let i = currentSlots; i < maxSlots; i++) {
                const slot = document.createElement('div');
                slot.className = 'grid-slot';
                slot.id = `grid-slot-${i}`;
                slot.dataset.index = i;
                grid.appendChild(slot);
            }
        } else if (currentSlots > maxSlots) {
            // Remove excess slots
            while (grid.children.length > maxSlots) {
                grid.removeChild(grid.lastChild);
            }
        }
        
        // Update all slots
        for (let i = 0; i < maxSlots; i++) {
            const slot = document.getElementById(`grid-slot-${i}`);
            const generator = GAME.state.powerGenerators[i];
            
            if (generator) {
                const config = GAME.CONFIG.GENERATORS[generator.type];
                const power = GAME.getGeneratorPower(generator.id);
                const upgradeLevel = GAME.state.generatorUpgrades[generator.id] || 0;
                
                // Check if slot needs to be recreated (generator changed or slot empty)
                const currentGenId = slot.dataset.generatorId;
                if (currentGenId !== generator.id) {
                    // Create new content
                    let slotContent = `
                        <div class="generator-item">
                            <span class="gen-emoji">${config.emoji}</span>
                            <span class="gen-type">${config.name}</span>
                            <span class="gen-power">${GAME.formatNumber(power)} ⚡</span>
                    `;
                    
                    if (config.upgradable) {
                        const buyAmountText = this.buyAmount === 'max' ? 'MAX' : `x${this.buyAmount}`;
                        slotContent += `<span class="gen-upgrade">Lvl: ${upgradeLevel}</span>`;
                        const upgradeCost = GAME.getGeneratorUpgradeCost(generator.id) || 0;
                        const canAfford = GAME.state.coins >= upgradeCost;
                        slotContent += `<button class="gen-upgrade-btn ${!canAfford ? 'disabled' : ''}" data-id="${generator.id}" title="Upgrade this generator">${buyAmountText} ${GAME.formatNumber(upgradeCost)}</button>`;
                    }
                    
                    slotContent += `</div>`;
                    slot.innerHTML = slotContent;
                    slot.dataset.generatorId = generator.id;
                    slot.style.cursor = 'pointer';
                    slot.classList.add('occupied');
                } else {
                    // Just update the values without recreating DOM
                    const powerSpan = slot.querySelector('.gen-power');
                    if (powerSpan) {
                        powerSpan.textContent = `${GAME.formatNumber(power)} ⚡`;
                    }
                    
                    if (config.upgradable) {
                        const upgradeSpan = slot.querySelector('.gen-upgrade');
                        const upgradeBtn = slot.querySelector('.gen-upgrade-btn');
                        
                        if (upgradeSpan) {
                            upgradeSpan.textContent = `Lvl: ${upgradeLevel}`;
                        }
                        
                        if (upgradeBtn) {
                            const buyAmountText = this.buyAmount === 'max' ? 'MAX' : `x${this.buyAmount}`;
                            const upgradeCost = GAME.getGeneratorUpgradeCost(generator.id) || 0;
                            const canAfford = GAME.state.coins >= upgradeCost;
                            upgradeBtn.textContent = `${buyAmountText} ${GAME.formatNumber(upgradeCost)}`;
                            upgradeBtn.classList.toggle('disabled', !canAfford);
                        }
                    }
                }
            } else {
                if (slot.dataset.generatorId) {
                    slot.innerHTML = '';
                    slot.dataset.generatorId = '';
                    slot.style.cursor = 'default';
                    slot.classList.remove('occupied');
                }
            }
        }
    },

    /**
     * Setup achievements tab
     */
    setupAchievementsTab() {
        // Defensive defaults to avoid ReferenceError when parts of setup fail
        let unlockedCount = 0;
        let totalCount = 0;
        let totalSkillPoints = 0;
        let totalPrestigeBonus = 0;
        let container = null;
        let categoryData = {};
        let unlockedSet = new Set();

        try {
            // Initialize daily challenges
            GAME.initDailyChallenges();
            this.renderDailyChallenges();
            this.startDailyTimer();
            
            container = document.getElementById('achievementsGrid');
            if (container) container.innerHTML = '';
        // Clear any previous UI-side fighting timer to avoid duplicates
        try { if (this._fightingInterval) { clearInterval(this._fightingInterval); this._fightingInterval = null; } } catch(e) {}
        
        categoryData = {
            'clicking': { name: 'Clicking', icon: '👆', color: '#ffd700' },
            'servers': { name: 'Servers', icon: '🖥️', color: '#00d4ff' },
            'power': { name: 'Power', icon: '⚡', color: '#ff6b35' },
            'battery': { name: 'Battery', icon: '🔋', color: '#2ecc71' },
            'upgrades': { name: 'Upgrades', icon: '⬆️', color: '#9b59b6' },
            'research': { name: 'Research', icon: '🔬', color: '#3498db' },
            'prestige': { name: 'Prestige', icon: '✨', color: '#e91e63' },
            'casino': { name: 'Casino', icon: '🎰', color: '#f39c12' },
            'special': { name: 'Special', icon: '🌟', color: '#ff9800' }
        };
        
        // Calculate stats
        try {
            unlockedSet = this.getStateSet('unlockedAchievements');
            unlockedCount = unlockedSet.size;
            totalCount = (GAME && GAME.CONFIG && Array.isArray(GAME.CONFIG.ACHIEVEMENTS)) ? GAME.CONFIG.ACHIEVEMENTS.length : 0;
            totalSkillPoints = (GAME && GAME.CONFIG && Array.isArray(GAME.CONFIG.ACHIEVEMENTS)) ? GAME.CONFIG.ACHIEVEMENTS.reduce((sum, ach) => {
                if (unlockedSet.has(ach.id)) return sum + (ach.reward?.skillPoints || 0);
                return sum;
            }, 0) : 0;
            totalPrestigeBonus = (GAME && GAME.CONFIG && Array.isArray(GAME.CONFIG.ACHIEVEMENTS)) ? GAME.CONFIG.ACHIEVEMENTS.reduce((sum, ach) => {
                if (unlockedSet.has(ach.id)) return sum + (ach.reward?.prestigeBonus || 0);
                return sum;
            }, 0) : 0;
        } catch (e) {
            console.warn('UI.setupAchievementsTab: stats calc failed', e);
        }
        } catch (e) {
            console.error('UI.setupAchievementsTab error', e);
            try { const container = document.getElementById('achievementsGrid'); if (container) container.innerHTML = '<div class="error">Failed to load achievements. See console.</div>'; } catch(e){}
            return; // abort further rendering to avoid referencing undefined locals
        }
        
        // Create header with overall progress
        const header = document.createElement('div');
        header.className = 'achievements-main-header';
        header.innerHTML = `
            <div class="achievements-title-row">
                <h2>🏆 Achievements</h2>
                <div class="achievements-overall-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${(unlockedCount / totalCount) * 100}%"></div>
                    </div>
                    <span class="progress-text">${unlockedCount} / ${totalCount}</span>
                </div>
            </div>
            <div class="achievements-summary">
                <div class="summary-card">
                    <span class="summary-icon">🎯</span>
                    <div class="summary-info">
                        <span class="summary-value">${totalSkillPoints}</span>
                        <span class="summary-label">Skill Points Earned</span>
                    </div>
                </div>
                <div class="summary-card">
                    <span class="summary-icon">🏅</span>
                    <div class="summary-info">
                        <span class="summary-value">${GAME.state.achievementPoints || 0}</span>
                        <span class="summary-label">Achievement Points</span>
                    </div>
                </div>
                <div class="summary-card">
                    <span class="summary-icon">✨</span>
                    <div class="summary-info">
                        <span class="summary-value">+${(totalPrestigeBonus * 100).toFixed(0)}%</span>
                        <span class="summary-label">Prestige Bonus</span>
                    </div>
                </div>
                <div class="summary-card">
                    <span class="summary-icon">📊</span>
                    <div class="summary-info">
                        <span class="summary-value">${Math.floor((unlockedCount / totalCount) * 100)}%</span>
                        <span class="summary-label">Completion</span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(header);
        
        // Create daily rewards section
        const dailyRewardsSection = document.createElement('div');
        dailyRewardsSection.className = 'daily-rewards-section';
        dailyRewardsSection.innerHTML = `
            <div class="daily-rewards-header">
                <h3>📅 Daily Login Rewards</h3>
                <div class="daily-streak-info">
                    <span class="streak-icon">🔥</span>
                    <span class="streak-text">Current Streak: ${GAME.state.dailyStreak || 0} days</span>
                    <span class="streak-best">Best: ${GAME.state.longestDailyStreak || 0} days</span>
                </div>
            </div>
            <div class="daily-rewards-grid">
                ${GAME.CONFIG.DAILY_REWARDS.map((reward, index) => {
                    const day = index + 1;
                    const dailyClaimedSet = this.getStateSet('dailyRewardsClaimed');
                    const isClaimed = dailyClaimedSet.has(day);
                    const isCurrent = day === (GAME.state.dailyStreak || 0);
                    const canClaim = isCurrent && !isClaimed;
                    
                    return `
                        <div class="daily-reward-card ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''} ${canClaim ? 'available' : ''}">
                            <div class="reward-day">Day ${day}</div>
                            <div class="reward-icon">${isClaimed ? '✅' : canClaim ? '🎁' : '🔒'}</div>
                            <div class="reward-amounts">
                                <div class="reward-coins">💰 ${GAME.formatNumber(reward.coins)}</div>
                                ${reward.achievementPoints ? `<div class="reward-points">🏅 ${reward.achievementPoints}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(dailyRewardsSection);
        
        // Create category sections
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'achievements-categories';
        
        for (const [catKey, catInfo] of Object.entries(categoryData)) {
            const catAchievements = GAME.CONFIG.ACHIEVEMENTS.filter(a => a.category === catKey);
            if (catAchievements.length === 0) continue;
            
            const unlockedInCat = catAchievements.filter(a => unlockedSet.has(a.id)).length;
            const isComplete = unlockedInCat === catAchievements.length;
            
            const section = document.createElement('div');
            section.className = 'achievement-category-section';
            if (isComplete) section.classList.add('complete');
            
            section.innerHTML = `
                <div class="category-header" style="--cat-color: ${catInfo.color}">
                    <div class="category-title">
                        <span class="category-icon">${catInfo.icon}</span>
                        <span class="category-name">${catInfo.name}</span>
                        <span class="category-progress">${unlockedInCat}/${catAchievements.length}</span>
                    </div>
                    <div class="category-progress-bar">
                        <div class="category-progress-fill" style="width: ${(unlockedInCat / catAchievements.length) * 100}%; background: ${catInfo.color}"></div>
                    </div>
                    <span class="category-toggle">▼</span>
                </div>
                <div class="category-achievements"></div>
            `;
            
            const achievementsGrid = section.querySelector('.category-achievements');
            
            // Sort achievements: unlocked first
            const sortedAchievements = [...catAchievements].sort((a, b) => {
                const aUnlocked = unlockedSet.has(a.id);
                const bUnlocked = unlockedSet.has(b.id);
                if (aUnlocked && !bUnlocked) return -1;
                if (!aUnlocked && bUnlocked) return 1;
                return 0;
            });
            
            for (const achievement of sortedAchievements) {
                const isUnlocked = unlockedSet.has(achievement.id);
                const skillPointReward = achievement.reward?.skillPoints || 0;
                const prestigeBonus = achievement.reward?.prestigeBonus || 0;
                
                const card = document.createElement('div');
                card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;
                card.innerHTML = `
                    <div class="achievement-icon">${isUnlocked ? '🏆' : '🔒'}</div>
                    <div class="achievement-info">
                        <span class="achievement-name">${achievement.name}</span>
                        <span class="achievement-desc">${achievement.description}</span>
                        <div class="achievement-rewards">
                            <span class="reward">🎯 ${skillPointReward}</span>
                            <span class="reward">✨ +${(prestigeBonus * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                `;
                achievementsGrid.appendChild(card);
            }
            
            // Toggle functionality
            const headerEl = section.querySelector('.category-header');
            headerEl.addEventListener('click', () => {
                section.classList.toggle('collapsed');
            });
            
            categoriesContainer.appendChild(section);
        }
        
        container.appendChild(categoriesContainer);
    },

    /**
     * Setup fighting tab
     */
    setupFightingTab() {
        const container = document.getElementById('fightingGrid');
        if (!container) return;

        container.innerHTML = '';

        // Use explicit alias (G) to reference the runtime GAME object
        const G = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
        // Check if fighting is unlocked — additional debug info
        // quick checks for fighting unlock handled below
        let isUnlocked = false;
        if (G && G.isFightingUnlocked && typeof G.isFightingUnlocked === 'function') {
            isUnlocked = G.isFightingUnlocked();
        } else {
            // Fallbacks: check state flag, direct skillTreeLevels key, or GAME.getSkillLevel
            const flag = G && G.state ? !!G.state.fightingUnlocked : false;
            const byKey = G && G.state && G.state.skillTreeLevels ? !!G.state.skillTreeLevels['fighting_spartan'] : false;
            let byFunc = false;
            if (G && G.getSkillLevel && typeof G.getSkillLevel === 'function') {
                try { byFunc = G.getSkillLevel('fighting', 'spartan') > 0; } catch (e) { console.log('fallback getSkillLevel error', e); }
            }
            // fallback checks will decide unlock state
            isUnlocked = flag || byKey || byFunc;
        }
        console.log('Checking fighting unlock:', isUnlocked);
        if (!isUnlocked) {
            container.innerHTML = `
                <div class="fighting-locked">
                    <h2>⚔️ Fighting System Locked</h2>
                    <p>Unlock the fighting skill tree to access boss battles!</p>
                    <div class="unlock-requirement">
                        <span>🔓 Requires: Spartan skill</span>
                    </div>
                </div>
            `;
            return;
        }

        // Stamina + upgrades bar
        const topBar = document.createElement('div');
        topBar.className = 'fighting-topbar';
        const staminaCurrent = (G.state.fightingStamina || 0);
        const staminaMax = (G.state.fightingStaminaMax || 0);
        // compute player combat stats for display
        const pStats = (G && typeof G.calculatePlayerCombatStats === 'function') ? G.calculatePlayerCombatStats() : { attack: 0, defense: 0, maxHp: 0 };
        topBar.innerHTML = `
            <div class="stamina-display">
                <div class="stamina-label">🔋 Stamina</div>
                    <div class="stamina-bar">
                    <div id="fightingStaminaFill" class="stamina-fill" style="width: ${staminaMax === 0 ? 0 : (staminaCurrent / staminaMax) * 100}%"></div>
                    <div id="fightingStaminaText" class="stamina-text">${staminaCurrent.toFixed(1)}/${staminaMax.toFixed(0)} (+${G.state.fightingStaminaRegen || 0}/s)</div>
                </div>
            </div>
            <div class="combat-stats">
                <div class="stat-item">⚔️ Damage: ${pStats.attack}</div>
                <div class="stat-item">❤️ Health: ${pStats.maxHp}</div>
                <div class="stat-item">🛡️ Defence: ${Math.round(Math.min(0.99, (pStats.defense || 0) / 100) * 100)}%</div>
            </div>
            <!-- upgrades moved into Training tab -->
        `;
        container.appendChild(topBar);

        // Turn indicator removed (UI simplified)

        // upgrades moved into Training section (listeners attached there)

        // Create battle arena section
        const battleSection = document.createElement('div');
        battleSection.className = 'fighting-battle-section';

        // Ensure battle overlays are hidden if there is no active battle to avoid stuck overlay states
        try {
            const overlay = document.getElementById('bossBattleOverlay');
            const victoryOverlay = document.getElementById('bossVictoryOverlay');
            const defeatOverlay = document.getElementById('bossDefeatOverlay');
            // Only hide overlays when there is no active battle AND there is no recent battle result to show.
            const lastResult = (G && G.state && G.state.lastBattleResult) ? G.state.lastBattleResult : null;
            const recentResult = lastResult && ((Date.now() - (lastResult.time || 0)) <= 5000);
            try { console.log('setupFightingTab: top overlay hide check', { hasCurrentBattle: !!G.state.currentBattle, lastResult, recentResult }); } catch(e) {}
            if (!G.state.currentBattle && !recentResult) {
                if (overlay) overlay.classList.add('hidden');
                if (victoryOverlay) victoryOverlay.classList.add('hidden');
                if (defeatOverlay) defeatOverlay.classList.add('hidden');
            }
        } catch (e) { /* ignore */ }

        if (G.state.currentBattle) {
            console.log('setupFightingTab: Rendering active battle', { boss: (G.state.currentBattle.boss && G.state.currentBattle.boss.name) ? G.state.currentBattle.boss.name : '?', bossHp: G.state.currentBattle.boss && G.state.currentBattle.boss.currentHp, playerHp: G.state.currentBattle.player && G.state.currentBattle.player.currentHp, turn: G.state.currentBattle.turn });
            // If the saved battle is malformed or missing player/boss, clear it to avoid blank UI (e.g. broken save)
            if (!G.state.currentBattle.boss || !G.state.currentBattle.player || !G.state.currentBattle.startTime || !G.state.currentBattle.timeLimit) {
                console.warn('UI: Invalid currentBattle detected, clearing to avoid stuck overlay');
                G.state.currentBattle = null;
                try { if (GAME && typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e) {}
                // Recalculate the Fighting tab since we removed the invalid battle
                this.setupFightingTab();
                return;
            }
                // Quick UI-level immediate finish guard: if HP already at 0, show overlays directly
            try {
                const cb = G.state.currentBattle;
                const justStartedAge = (cb && cb._justStarted) ? (Date.now() - cb._justStarted) : 9999999;
                if (justStartedAge <= 1000) { console.log('setupFightingTab: skipping immediate resolve due to recent start', justStartedAge); }
                if (justStartedAge > 1000 && cb.boss && (cb.boss.currentHp || 0) <= 0) {
                    // Avoid double-resolving the same battle
                    if (cb._resolving) { console.log('setupFightingTab: resolve already in progress (boss HP <= 0)'); return; }
                    try { Object.defineProperty(cb, '_resolving', { value: true, writable: true, enumerable: false }); } catch(e) { cb._resolving = true; }
                    const overlay = document.getElementById('bossVictoryOverlay');
                    if (overlay) {
                        const victoryBossName = document.getElementById('victoryBossName');
                        const victorySkillPoints = document.getElementById('victorySkillPoints');
                        const victoryCoins = document.getElementById('victoryCoins');
                        if (victoryBossName) victoryBossName.textContent = cb.boss.name || 'UNKNOWN';
                        if (victorySkillPoints) victorySkillPoints.textContent = '0';
                        if (victoryCoins) victoryCoins.textContent = '0';
                        overlay.classList.remove('hidden');
                    }
                    // Try to finalize via runtime / engine / legacy fallbacks
                    try {
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        let called = false;
                        try { if (runtime && typeof runtime.winBattle === 'function') { console.log('setupFightingTab: calling runtime.winBattle()'); runtime.winBattle(); called = true; } } catch(e) { console.warn('setupFightingTab runtime.winBattle error', e); }
                        try { if (!called && typeof GAME !== 'undefined' && typeof GAME.winBattle === 'function') { console.log('setupFightingTab: calling GAME.winBattle()'); GAME.winBattle(); called = true; } } catch(e) { console.warn('setupFightingTab GAME.winBattle error', e); }
                        try { const bossGlobal = (typeof BossBattle !== 'undefined') ? BossBattle : null; if (!called && bossGlobal && typeof bossGlobal.endBattle === 'function') { console.log('setupFightingTab: calling BossBattle.endBattle(true)'); bossGlobal.endBattle(true, (cb && cb.boss) ? cb.boss : cb); called = true; } } catch(e) { console.warn('setupFightingTab BossBattle.endBattle error', e); }
                        if (!called) {
                            // last resort: mark it ended then persist and store a minimal lastBattleResult so the UI shows a summary
                            console.log('setupFightingTab: no handler available; marking battle ended and persisting (victory)');
                            try { cb._ended = true; cb._endExpiresAt = Date.now() + 4000; } catch(e) {}
                            try { if (GAME && typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e) {}
                            try {
                                if (GAME && GAME.state) {
                                    // Ensure the engine has a reference to the current battle before calling its handlers
                                    try { if (!GAME.state.currentBattle) { GAME.state.currentBattle = cb; } } catch(e) {}
                                    GAME.state.lastBattleResult = {
                                        outcome: 'victory',
                                        bossId: cb.boss && cb.boss.id ? cb.boss.id : null,
                                        bossName: cb.boss && cb.boss.name ? cb.boss.name : 'UNKNOWN',
                                        rewardCoins: (cb.boss && cb.boss.reward && cb.boss.reward.coins) ? cb.boss.reward.coins : 0,
                                        rewardSkillPoints: (cb.boss && cb.boss.reward && cb.boss.reward.skillPoints) ? cb.boss.reward.skillPoints : 0,
                                        time: Date.now()
                                    };
                                    // As a final fallback, try to let the GAME process the win so rewards and progression apply
                                    try {
                                        if (typeof GAME !== 'undefined' && typeof GAME.winBattle === 'function') {
                                            GAME.winBattle();
                                            try { if (typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e) {}
                                        } else if (typeof GAME !== 'undefined' && typeof GAME.handleVictory === 'function') {
                                            GAME.handleVictory();
                                            try { if (typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e) {}
                                        }
                                    } catch(e) { console.warn('setupFightingTab: fallback GAME.winBattle/handleVictory failed', e); }
                                }
                            } catch(e) {}
                        }
                    } catch (e) { console.error('setupFightingTab: fallback handler call failed', e); }
                    try { if (typeof GAME !== 'undefined' && GAME.saveGame) GAME.saveGame(); } catch(e) {}
                    container.appendChild(document.createElement('div'));
                    // Allow cleanup to run then clear resolving marker
                    setTimeout(() => { try { delete cb._resolving; } catch(e) {} }, 500);
                    return;
                }
                if (justStartedAge > 1000 && cb.player && (cb.player.currentHp || 0) <= 0) {
                    if (cb._resolving) { console.log('setupFightingTab: resolve already in progress (player HP <= 0)'); return; }
                    try { Object.defineProperty(cb, '_resolving', { value: true, writable: true, enumerable: false }); } catch(e) { cb._resolving = true; }
                    const overlay = document.getElementById('bossDefeatOverlay');
                    if (overlay) {
                        const defeatBossName = document.getElementById('defeatBossName');
                        const defeatPenalty = document.getElementById('defeatPenalty');
                        if (defeatBossName) defeatBossName.textContent = cb.boss.name || 'UNKNOWN';
                        // Show an estimated penalty immediately so UI reflects expected loss while handler runs
                        try {
                            const coins = (typeof GAME !== 'undefined' && GAME.state) ? (GAME.state.coins || 0) : 0;
                            const penaltyPct = (cb.boss && cb.boss.isRandomSpawn) ? 0.40 : (typeof GAME !== 'undefined' && typeof GAME.PENALTY_PERCENT === 'number' ? GAME.PENALTY_PERCENT : 0.25);
                            const estimatedPenalty = Math.min(coins, Math.floor(coins * penaltyPct));
                            if (defeatPenalty) defeatPenalty.textContent = (typeof GAME !== 'undefined' && GAME.formatNumber) ? GAME.formatNumber(estimatedPenalty) : String(estimatedPenalty);
                        } catch (e) { if (defeatPenalty) defeatPenalty.textContent = '0'; }
                        overlay.classList.remove('hidden');
                    }
                    try {
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        let called = false;
                        try { if (runtime && typeof runtime.loseBattle === 'function') { console.log('setupFightingTab: calling runtime.loseBattle()'); runtime.loseBattle(); called = true; } } catch(e) { console.warn('setupFightingTab runtime.loseBattle error', e); }
                        try { if (!called && typeof GAME !== 'undefined' && typeof GAME.loseBattle === 'function') { console.log('setupFightingTab: calling GAME.loseBattle()'); GAME.loseBattle(); called = true; } } catch(e) { console.warn('setupFightingTab GAME.loseBattle error', e); }
                        try { const bossGlobal = (typeof BossBattle !== 'undefined') ? BossBattle : null; if (!called && bossGlobal && typeof bossGlobal.endBattle === 'function') { console.log('setupFightingTab: calling BossBattle.endBattle(false)'); bossGlobal.endBattle(false, (cb && cb.boss) ? cb.boss : cb); called = true; } } catch(e) { console.warn('setupFightingTab BossBattle.endBattle(false) error', e); }
                        if (!called) { console.log('setupFightingTab: no handler to finish defeat - marking ended'); try { cb._ended = true; cb._endExpiresAt = Date.now() + 4000; } catch(e) {} try { if (GAME && typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e) {} try {
                                if (GAME && GAME.state) {
                                    // compute sensible penalty amount for fallback display
                                    try {
                                        const coins = GAME.state.coins || 0;
                                        const penaltyPct = (cb.boss && cb.boss.isRandomSpawn) ? 0.40 : (typeof GAME.PENALTY_PERCENT === 'number' ? GAME.PENALTY_PERCENT : 0.25);
                                        const penaltyAmt = Math.min(coins, Math.floor(coins * penaltyPct));
                                        GAME.state.lastBattleResult = { outcome: 'defeat', bossId: cb.boss && cb.boss.id ? cb.boss.id : null, bossName: cb.boss && cb.boss.name ? cb.boss.name : 'UNKNOWN', penalty: penaltyAmt, time: Date.now() };
                                    } catch (e) {
                                        GAME.state.lastBattleResult = { outcome: 'defeat', bossId: cb.boss && cb.boss.id ? cb.boss.id : null, bossName: cb.boss && cb.boss.name ? cb.boss.name : 'UNKNOWN', penalty: 0, time: Date.now() };
                                    }
                                }
                            } catch(e) {} }
                    } catch (e) { console.error('setupFightingTab: fallback defeat handler error', e); }
                    try { if (typeof GAME !== 'undefined' && GAME.saveGame) GAME.saveGame(); } catch(e) {}
                    container.appendChild(document.createElement('div'));
                    setTimeout(() => { try { delete cb._resolving; } catch(e) {} }, 500);
                    return;
                }
            } catch (e) { console.log('UI immediate overlay guard failed', e); }
            // Quick guard: if HP conditions already reached, ensure engine/UI shows outcome promptly
            try {
                const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                if (G.state.currentBattle.boss && (G.state.currentBattle.boss.currentHp || 0) <= 0) {
                    if (runtime && typeof runtime.winBattle === 'function') runtime.winBattle();
                }
                if (G.state.currentBattle.player && (G.state.currentBattle.player.currentHp || 0) <= 0) {
                    if (runtime && typeof runtime.loseBattle === 'function') runtime.loseBattle();
                }
            } catch (e) { console.log('setupFightingTab pre-check error', e); }
            // Active battle UI
            const battle = G.state.currentBattle;
            // Defensive sanity: ensure arrays exist
            if (!Array.isArray(battle.battleLog)) battle.battleLog = Array.isArray(battle.battleLog) ? battle.battleLog : [];
            if (!Array.isArray(battle.attacksUsed)) battle.attacksUsed = Array.isArray(battle.attacksUsed) ? battle.attacksUsed : [];

            // Wrap the rendering in a try/catch. If any uncaught runtime error occurs here, recover by clearing the battle
            try {
            const boss = battle.boss;
            const player = battle.player;
            const timeLeft = Math.max(0, battle.timeLimit - (Date.now() - battle.startTime));

            battleSection.innerHTML = `
                <div class="battle-arena">
                    <div class="battle-header">
                        <h3>⚔️ Battling: ${boss.name}</h3>
                        <div class="battle-timer">⏰ ${Math.ceil(timeLeft / 1000)}s</div>
                    </div>

                    <div class="battle-status">
                        <div class="boss-status">
                            <div class="status-name">${boss.name}</div>
                            <div class="health-bar">
                                <div class="health-fill" style="width: ${(boss.currentHp / boss.maxHp) * 100}%"></div>
                                <div class="health-text">${boss.currentHp}/${boss.maxHp}</div>
                            </div>
                        </div>

                        <div class="player-status">
                            <div class="player-portrait">
                                <div class="player-cartoon" id="initiativePlayerAvatar">👤</div>
                            </div>
                            <div class="status-name">You</div>
                            <div class="health-bar">
                                <div class="health-fill" style="width: ${(player.currentHp / player.maxHp) * 100}%"></div>
                                <div class="health-text">${player.currentHp}/${player.maxHp}</div>
                            </div>
                        </div>
                    </div>

                    <div class="battle-actions">
                        <div class="initiative-bar" id="initiativeBar">
                            <div class="initiative-cell player-initiative">
                                <div class="pill">YOU</div>
                                <div class="initiative-action" id="initiativePlayerAction">${battle.playerAction && battle.playerAction.attack ? `${battle.playerAction.attack.name} (${battle.playerAction.attack.speed || '—'})` : '—'}</div>
                            </div>
                            <div class="initiative-cell boss-initiative">
                                <div class="pill">AI</div>
                                <div class="initiative-action" id="initiativeBossAction">${battle.bossAction && battle.bossAction.attack ? `${battle.bossAction.attack.name} (${battle.bossAction.attack.speed || '—'})` : '—'}</div>
                            </div>
                        </div>
                        <button class="run-away-inline" id="fightingRunBtn">RUN AWAY</button>
                        ${G.CONFIG && G.CONFIG.DEBUG ? `
                            <div class="fighting-debug-inline" id="fightingDebugInline">
                                <button class="btn debug debug-win" id="debugForceWin">Force Win</button>
                                <button class="btn debug debug-lose" id="debugForceLose">Force Lose</button>
                            </div>
                        ` : ''}
                    </div>

                    <div class="battle-attacks">
                        ${GAME.CONFIG.FIGHTING_ATTACKS.map(attack => {
                            const isUnlocked = (G && typeof G.isAttackUnlocked === 'function') ? G.isAttackUnlocked(attack.id) : true;
                            const lastUsed = battle.attacksUsed.find(a => a.id === attack.id);
                            const cooldown = lastUsed ? Math.max(0, attack.cooldown - (Date.now() - lastUsed.time)) : 0;
                            const isOnCooldown = cooldown > 0;
                            const staminaCost = attack.staminaCost || 0;
                            const hasStamina = (G && G.state && (G.state.fightingStamina || 0) >= staminaCost);

                            if (!isUnlocked) return '';

                            // Disable if out of turn
                            const outOfTurn = (battle.turn && battle.turn !== 'player');
                            const disabled = isOnCooldown || !hasStamina || outOfTurn;

                            return `
                                <button class="attack-button ${isOnCooldown ? 'cooldown' : ''} ${outOfTurn ? 'out-of-turn' : ''}"
                                    data-attack="${attack.id}"
                                    data-stamina="${staminaCost}"
                                    ${disabled ? 'disabled' : ''}>
                                    <div class="attack-name">${attack.name}</div>
                                    <div class="attack-damage">💥 ${(() => { const total = (pStats && pStats.attack ? pStats.attack : 0) + (attack.damage || 0); return total; })()}</div>
                                    <div class="attack-cooldown">⏰ ${Math.ceil(cooldown / 1000)}s</div>
                                    ${staminaCost > 0 ? `<div class="attack-cost">🔋 ${staminaCost}</div>` : ''}
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <div class="battle-log">
                        ${battle.battleLog.slice(-5).map(log => `<div class="log-entry">${log}</div>`).join('')}
                    </div>
                </div>
            `;
            } catch (renderErr) {
                console.error('setupFightingTab: Error rendering active battle. Clearing currentBattle to prevent blank UI', renderErr, { battle });
                try { if (G && G.state) { G.state.currentBattle = null; } } catch(e) {}
                try { if (GAME && typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e) {}
                // Provide a user-visible fallback message and force re-render
                battleSection.innerHTML = `<div class="battle-error">An error occurred while rendering this fight. The battle state has been cleared. Please try again.</div>`;
                container.appendChild(battleSection);
                return;
            }
            // (removed) emergency force-exit element — in-battle Run Away handles exits
            // Animate recent round events (if present)
            try {
                const events = (battle && Array.isArray(battle.recentRoundEvents)) ? battle.recentRoundEvents.slice(-4) : [];
                // choose initiative cells
                const playerCell = container.querySelector('.initiative-cell.player-initiative');
                const bossCell = container.querySelector('.initiative-cell.boss-initiative');
                // Clear any previous animation classes
                [playerCell, bossCell].forEach(c => { if (c) { c.classList.remove('action-hit','action-interrupted','first','second'); } });

                if (events && events.length > 0) {
                    // Determine which action resolved first by comparing speeds if available
                    const pAct = battle.playerAction && battle.playerAction.attack ? battle.playerAction.attack : null;
                    const bAct = battle.bossAction && battle.bossAction.attack ? battle.bossAction.attack : null;
                    const pSpeed = (pAct && pAct.speed) ? Number(pAct.speed) : 600;
                    const bSpeed = (bAct && bAct.speed) ? Number(bAct.speed) : 600;
                    if (playerCell && bossCell) {
                        if (pSpeed < bSpeed) playerCell.classList.add('first'), bossCell.classList.add('second'); else bossCell.classList.add('first'), playerCell.classList.add('second');
                    }

                    // Play per-event highlights
                    events.forEach(ev => {
                        if (!ev) return;
                        const actorCell = (ev.actor === 'player') ? playerCell : bossCell;
                        if (!actorCell) return;
                        if (ev.canceled) {
                            actorCell.classList.add('action-interrupted');
                            // highlight button if known
                            if (ev.attackId) {
                                const btn = container.querySelector(`button.attack-button[data-attack=\"${ev.attackId}\"]`);
                                if (btn) btn.classList.add('interrupted');
                            }
                        } else if (ev.damage && ev.damage > 0) {
                            actorCell.classList.add('action-hit');
                            // highlight the attack button
                            if (ev.attackId) {
                                const btn = container.querySelector(`button.attack-button[data-attack=\"${ev.attackId}\"]`);
                                if (btn) btn.classList.add('hit');
                            }
                            // if critical, add a pulse
                            if (ev.isCrit) actorCell.classList.add('action-crit');
                        }
                        // cleanup after animation
                        setTimeout(() => {
                            if (actorCell) actorCell.classList.remove('action-hit','action-interrupted','action-crit');
                            if (ev.attackId) {
                                const btn2 = container.querySelector(`button.attack-button[data-attack=\"${ev.attackId}\"]`);
                                if (btn2) btn2.classList.remove('interrupted','hit');
                            }
                        }, 900);
                    });

                    // clear the recent events from the battle (so next UI update doesn't re-trigger)
                    try { delete battle.recentRoundEvents; } catch (e) {}
                }
            } catch (e) { console.log('initiative animation error', e); }
        } else {
            // Boss selection UI
            // Defensive: GAME.getAvailableBosses may be missing at runtime — fallback to reading config
            let availableBosses = [];
            if (G && G.getAvailableBosses && typeof G.getAvailableBosses === 'function') {
                try {
                    availableBosses = G.getAvailableBosses();
                } catch (e) {
                    console.log('Error calling G.getAvailableBosses()', e);
                }
            }
            const battlesWon = G && G.state && G.state.fightingStats ? G.state.fightingStats.battlesWon : 0;
            // Show all bosses, but mark locked ones
            if (!availableBosses || !Array.isArray(availableBosses)) {
                console.log('Falling back to CONFIG.FIGHTING_BOSSES for available bosses');
                const battlesWon = G && G.state && G.state.fightingStats ? G.state.fightingStats.battlesWon : 0;
                availableBosses = (G && G.CONFIG && G.CONFIG.FIGHTING_BOSSES) ? G.CONFIG.FIGHTING_BOSSES.filter(b => battlesWon >= b.unlockRequirement) : [];
            }

            // If there was a recent result (win/lose) show a short summary so the tab isn't blank
            const recent = G && G.state ? G.state.lastBattleResult : null;
            // If the victory overlay is currently visible, prefer that over showing the inline summary
            const victoryOverlayElement = document.getElementById('bossVictoryOverlay');
            const defeatOverlayElement = document.getElementById('bossDefeatOverlay');
            const isVictoryOverlayVisible = victoryOverlayElement && !victoryOverlayElement.classList.contains('hidden');
            const isDefeatOverlayVisible = defeatOverlayElement && !defeatOverlayElement.classList.contains('hidden');
            if (recent && (Date.now() - (recent.time || 0) < 15000) && !isVictoryOverlayVisible && !isDefeatOverlayVisible) {
                // If a recent battle result exists, prefer the full overlay for victory/defeat rather than inline summary
                try {
                    const victoryOverlay = document.getElementById('bossVictoryOverlay');
                    const defeatOverlay = document.getElementById('bossDefeatOverlay');
                    if (recent.outcome === 'victory' && victoryOverlay) {
                        const victoryBossName = document.getElementById('victoryBossName');
                        const victorySkillPoints = document.getElementById('victorySkillPoints');
                        const victoryCoins = document.getElementById('victoryCoins');
                        const victoryUnlockNote = document.getElementById('victoryUnlockNote');
                        if (victoryBossName) victoryBossName.textContent = recent.bossName || 'UNKNOWN';
                        if (victorySkillPoints) victorySkillPoints.textContent = recent.rewardSkillPoints || 0;
                        if (victoryCoins) victoryCoins.textContent = GAME.formatNumber(recent.rewardCoins || 0);
                        victoryOverlay.classList.remove('hidden');
                        if (victoryUnlockNote) {
                            if (recent.specialUnlock) {
                                if (recent.specialUnlock === 'crude_ai') {
                                    victoryUnlockNote.textContent = '🔓 New Boss Unlocked: Crude AI';
                                } else {
                                    victoryUnlockNote.textContent = `🔓 New Unlock: ${recent.specialUnlock}`;
                                }
                                victoryUnlockNote.classList.remove('hidden');
                            } else {
                                victoryUnlockNote.classList.add('hidden');
                                victoryUnlockNote.textContent = '';
                            }
                        }
                        // Keep the outcome state & avoid inline summary
                        return;
                    }
                    if (recent.outcome === 'defeat' && defeatOverlay) {
                        try { console.log('setupFightingTab: showing defeat overlay from lastBattleResult', recent); } catch(e) {}
                        const defeatBossName = document.getElementById('defeatBossName');
                        const defeatPenalty = document.getElementById('defeatPenalty');
                        if (defeatBossName) defeatBossName.textContent = recent.bossName || 'UNKNOWN';
                        if (defeatPenalty) defeatPenalty.textContent = GAME.formatNumber(recent.penalty || 0);
                        defeatOverlay.classList.remove('hidden');
                        try {
                            const rematchBtn = document.getElementById('rematchBossBtn');
                            if (rematchBtn) rematchBtn.style.display = (G && G.state && G.state.lastBossAttempt) ? '' : 'none';
                        } catch (e) {}
                        // Keep the outcome state & avoid inline summary
                        return;
                    }
                } catch (e) {
                    console.warn('Error showing overlay for recent battle result', e);
                }
                const isVictory = recent.outcome === 'victory';
                const resultHtml = `
                    <div class="recent-battle-result ${isVictory ? 'victory' : 'defeat'}">
                        <h3>${isVictory ? '🎉 Victory!' : '💀 Defeat'}</h3>
                        <div class="result-body">
                            <div>${recent.bossName ? `Opponent: <strong>${recent.bossName}</strong>` : ''}</div>
                            ${isVictory ? `<div>Coins: <strong>${GAME.formatNumber(recent.rewardCoins || 0)}</strong> • Skill: <strong>${recent.rewardSkillPoints || 0}</strong></div>` : ''}
                        </div>
                        <div style="margin-top:8px"><button id="recentResultContinue" class="btn">Continue</button></div>
                    </div>
                `;
                battleSection.innerHTML = resultHtml;
                container.appendChild(battleSection);

                // wire continue button to close overlays/reset state
                setTimeout(() => {
                    const cont = document.getElementById('recentResultContinue');
                    if (cont) {
                        cont.addEventListener('click', () => {
                            console.log('DEBUG: recentResultContinue clicked', { outcome: recent.outcome });
                            try {
                                const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                                // ensure both legacy and env runtime clobbers are cleared if available
                                if (recent.outcome === 'victory') {
                                    try { if (typeof BossBattle !== 'undefined' && BossBattle && typeof BossBattle.closeVictory === 'function') { console.log('DEBUG: calling BossBattle.closeVictory from recentResultContinue'); BossBattle.closeVictory(); } } catch(e) { console.warn('BossBattle.closeVictory call failed', e); }
                                    try {
                                        if (runtime && typeof runtime.closeVictory === 'function') {
                                            console.log('DEBUG: calling runtime.closeVictory from recentResultContinue');
                                            runtime.closeVictory();
                                        } else {
                                            console.warn('DEBUG: runtime.closeVictory not available');
                                        }
                                    } catch(e) { console.warn('runtime.closeVictory call failed', e); }
                                } else {
                                    try { if (typeof BossBattle !== 'undefined' && BossBattle && typeof BossBattle.closeDefeat === 'function') { console.log('DEBUG: calling BossBattle.closeDefeat from recentResultContinue at', new Date().toISOString()); BossBattle.closeDefeat(true); } } catch(e) { console.warn('BossBattle.closeDefeat call failed', e); }
                                    try {
                                        if (runtime && typeof runtime.closeDefeat === 'function') {
                                            console.log('DEBUG: calling runtime.closeDefeat from recentResultContinue at', new Date().toISOString());
                                            runtime.closeDefeat(true);
                                        } else {
                                            console.warn('DEBUG: runtime.closeDefeat not available');
                                        }
                                    } catch(e) { console.warn('runtime.closeDefeat call failed', e); }
                                }
                            } catch (e) { console.log('recentResultContinue handler error', e); }
                            // Safety fallback: if runtime didn't clear `lastBattleResult` or `currentBattle`, clear from UI
                            try {
                                const r = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                                let needSave = false;
                                if (r && r.state) {
                                    if (r.state.lastBattleResult) { console.log('DEBUG: recentResultContinue fallback - clearing lastBattleResult in runtime'); delete r.state.lastBattleResult; needSave = true; }
                                    // Only clear a persisted currentBattle if it's marked ended to avoid dropping in-progress battles
                                    try {
                                        if (r.state.currentBattle && r.state.currentBattle._ended) { console.log('DEBUG: recentResultContinue fallback - clearing ended currentBattle in runtime'); r.state.currentBattle = null; needSave = true; }
                                    } catch (e) { /* ignore */ }
                                }
                                if (typeof BossBattle !== 'undefined' && BossBattle && BossBattle.currentBattle) {
                                    console.log('DEBUG: recentResultContinue fallback - clearing BossBattle.currentBattle'); BossBattle.currentBattle = null; needSave = true;
                                }
                                if (needSave) {
                                    try { if (r && typeof r.saveGame === 'function') r.saveGame(); } catch(e) {}
                                }
                            } catch(e) { console.warn('recentResultContinue fallback clearing error', e); }
                            // Re-render the tab after attempting to close overlays/state
                            try { this.setupFightingTab(); } catch (e) { console.warn('setupFightingTab failed after recentResultContinue', e); }
                        });
                    }
                }, 10);
                return;
            }

            // Using a list of all bosses from config and show locked ones visually
            let bossListAll = (G && G.CONFIG && Array.isArray(G.CONFIG.FIGHTING_BOSSES)) ? G.CONFIG.FIGHTING_BOSSES : [];
            if ((!availableBosses || !Array.isArray(availableBosses) || availableBosses.length === 0) && bossListAll.length > 0) {
                const basic = G.CONFIG.FIGHTING_BOSSES.find(b => b.id === 'basic_ai');
                if (basic && battlesWon >= basic.unlockRequirement) {
                    console.log('No available bosses detected — falling back to basic_ai');
                    availableBosses.push(basic);
                }
            }

            // If still empty, show friendly fallback content to avoid blank UI
            if (!Array.isArray(availableBosses) || availableBosses.length === 0) {
                battleSection.innerHTML = `
                    <div class="boss-selection">
                        <h3>🎯 Choose Your Opponent</h3>
                        <div class="no-bosses">No opponents available at this time. Train your skills or check the Fighting skill tree to unlock more bosses.</div>
                    </div>
                `;
                container.appendChild(battleSection);
                return;
            }

            // Build dynamic boss HTMLs with progression info
            const bossesHTML = (bossListAll || []).map(boss => {
                const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                const progressionPeak = (runtime && runtime.state && (runtime.state.progressionPeakCoins || (runtime.state.stats && runtime.state.stats.peakCoins))) ? (runtime.state.progressionPeakCoins || (runtime.state.stats && runtime.state.stats.peakCoins)) : (runtime && runtime.state && runtime.state.coins) || 0;
                const dynamicReward = boss.progressionRewardPct ? Math.floor((progressionPeak || 0) * boss.progressionRewardPct) : ((boss.reward && boss.reward.coins) ? boss.reward.coins : 0);
                const counts = runtime && runtime.state && runtime.state.fightingProgressCounts ? runtime.state.fightingProgressCounts : {};
                // Progression requirement is based on previous boss defeats. If previous boss exists, show its progress.
                const prevIndex = bossListAll.findIndex(b => b.id === boss.id) - 1;
                const prevBoss = (prevIndex >= 0 && prevIndex < bossListAll.length) ? bossListAll[prevIndex] : null;
                let defeats = 0;
                let req = boss.progressionDefeatRequirement || 0;
                let unlockFromBossName = null;
                if (prevBoss && prevBoss.progressionDefeatRequirement) {
                    defeats = counts[prevBoss.id] || 0;
                    req = prevBoss.progressionDefeatRequirement || req;
                    unlockFromBossName = prevBoss.name;
                } else {
                    defeats = counts[boss.id] || 0;
                }
                // Determine lock state. For crude_ai, prefer explicit state checks so UI updates even
                // if runtime.isBossUnlocked isn't present or hasn't been wired yet.
                let locked;
                if (boss.id === 'crude_ai') {
                    const state = runtime && runtime.state ? runtime.state : null;
                    const unlockedSet = state && state.unlockedBosses ? state.unlockedBosses : null;
                    const unlockedViaSet = unlockedSet && (typeof unlockedSet.has === 'function' ? unlockedSet.has('crude_ai') : Array.isArray(unlockedSet) && unlockedSet.includes('crude_ai'));
                    const crudeNeeded = 2;
                    const unlockedViaRandom = state && (state.randomAIDefeats || 0) >= crudeNeeded;
                    const crudeUnlocked = !!(unlockedViaSet || unlockedViaRandom);
                    locked = !crudeUnlocked;
                } else {
                    locked = !(runtime && runtime.isBossUnlocked && runtime.isBossUnlocked(boss.id));
                }
                // Debug: log crude_ai unlock state when rendering (helps troubleshoot unlock not reflected)
                try {
                    if (boss.id === 'crude_ai') {
                        console.log('UI.setupFightingTab: crude status', { unlockedBosses: runtime && runtime.state && runtime.state.unlockedBosses, isUnlocked: (runtime && runtime.isBossUnlocked) ? runtime.isBossUnlocked('crude_ai') : null, randomAIDefeats: runtime && runtime.state && runtime.state.randomAIDefeats });
                    }
                } catch (e) { console.warn('UI crude debug log failed', e); }
                // If boss is Crude AI and it's locked for random-spawn unlocks, don't show the default progression line
                const hideDefaultProgression = (boss.id === 'crude_ai' && !boss.initiallyUnlocked && locked);
                // Show progress for Crude AI which is unlocked via random spawn defeats
                const randomAIDefeats = (runtime && runtime.state && runtime.state.randomAIDefeats) ? runtime.state.randomAIDefeats : 0;
                const crudeNeeded = 2;
                const progressionInfo = `${req > 0 ? `<small>${unlockFromBossName ? `Defeat ${unlockFromBossName}` : 'Defeats'}: ${defeats}/${req} ${unlockFromBossName ? `to unlock ${boss.name}` : 'to unlock next'} 📈</small>` : ''}`;
                // Only show progression text when the boss is still locked. Hide for unlocked bosses.
                let progressionHtml = `${(!hideDefaultProgression && req > 0 && locked) ? `<small>${unlockFromBossName ? `Defeat ${unlockFromBossName}` : 'Defeats'}: ${defeats}/${req} ${unlockFromBossName ? `to unlock ${boss.name}` : 'to unlock next'} 📈</small>` : ''}`;
                // Extra guard: if Crude AI is locked via random-spawn unlocking, always hide default progression line
                if (boss.id === 'crude_ai' && locked) progressionHtml = '';
                const displayCount = Math.min(randomAIDefeats, crudeNeeded);
                const remaining = Math.max(0, crudeNeeded - randomAIDefeats);
                const randomUnlockHtml = `${(boss.id === 'crude_ai' && locked) ? `<small class="random-unlock">Random AIs defeated: ${displayCount}/${crudeNeeded} (defeat ${remaining} more to unlock)</small>` : ''}`;
                return `
                    <div class="boss-card ${boss.appearance ? `appearance-${boss.appearance}` : ''} ${locked ? 'locked' : ''}" data-boss="${boss.id}">
                        <div class="boss-icon">${this.getBossIcon(boss)}</div>
                        <div class="boss-info">
                            <div class="boss-name">${boss.name}</div>
                            <div class="boss-desc">${boss.description}</div>
                            <div class="boss-stats">
                                <span>❤️ ${boss.health}</span>
                                <span>⚔️ ${boss.attack}</span>
                                <span>🛡️ ${boss.defense}</span>
                            </div>
                            <div class="boss-rewards">
                                <span>💰 ${G.formatNumber(dynamicReward)} ${boss.progressionRewardPct ? `<small>(${Math.round(boss.progressionRewardPct*100)}% of peak)</small>` : ''}</span>
                                <span>🎯 ${boss.reward.skillPoints}</span>
                                ${boss.reward.achievementPoints ? `<span>🏅 ${boss.reward.achievementPoints}</span>` : ''}
                            </div>
                            <div class="boss-progression">
                                ${progressionHtml}
                                ${randomUnlockHtml}
                            </div>
                        </div>
                        <div class="boss-risk risk-${boss.risk}">${boss.risk.toUpperCase()}</div>
                    </div>
                `;
            }).join('');
            
            // If we have a valid boss list from config, use it, otherwise fallback to availableBosses
            const renderBosses = (bossListAll.length > 0) ? bossListAll : availableBosses;

            battleSection.innerHTML = `
                <div class="boss-selection">
                    <h3>🎯 Choose Your Opponent</h3>
                    <div class="boss-grid">
                        ${bossesHTML}
                    </div>
                </div>
            `;
        }

        // Add internal sub-tabs (Battle / Training)
        const subTabBar = document.createElement('div');
        subTabBar.className = 'fighting-subtabs';
        subTabBar.innerHTML = `
            <button class="subtab-button active" data-view="battle">⚔️ Battle</button>
            <button class="subtab-button" data-view="training">🧠 Training</button>
            <button class="subtab-button" data-view="forge">🔨 Forge</button>
        `;
        container.appendChild(subTabBar);

        container.appendChild(battleSection);

        // Wire debug buttons if debug is enabled
        try {
            if (G.CONFIG && G.CONFIG.DEBUG) {
                const winBtn = battleSection.querySelector('#debugForceWin');
                const loseBtn = battleSection.querySelector('#debugForceLose');
                // Helper to resolve current runtime, legacy globals and the active battle at time of click
                const resolveRuntimeAndBattle = () => {
                    const runtimeNow = (typeof window !== 'undefined' && window.GAME) ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);
                    const gameGlobal = (typeof window !== 'undefined' && window.GAME) ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);
                    const bossGlobal = (typeof BossBattle !== 'undefined') ? BossBattle : null;
                    const activeBattle = (runtimeNow && runtimeNow.state && runtimeNow.state.currentBattle) ? runtimeNow.state.currentBattle : (runtimeNow && runtimeNow.currentBattle ? runtimeNow.currentBattle : (bossGlobal && bossGlobal.currentBattle ? bossGlobal.currentBattle : null));
                    return { runtimeNow, gameGlobal, bossGlobal, activeBattle };
                };
                // Resolve here to include runtime details for log (avoid using undefined runtime variable)
                const resolvedNow = resolveRuntimeAndBattle();
                console.log('DEBUG: wiring debug buttons', { winBtnExists: !!winBtn, loseBtnExists: !!loseBtn, runtimeExists: !!resolvedNow.runtimeNow, activeBattleExists: !!resolvedNow.activeBattle });
                if (winBtn) winBtn.addEventListener('click', () => {
                    try {
                        // Resolve latest references at click-time to avoid stale closures
                        const { runtimeNow, gameGlobal, bossGlobal, activeBattle } = resolveRuntimeAndBattle();
                        console.log('DEBUG: Force Win button clicked', { runtimeExists: !!runtimeNow, runtimeWinFunc: runtimeNow ? typeof runtimeNow.winBattle === 'function' : false, gameGlobalWinFunc: typeof gameGlobal?.winBattle === 'function', bossGlobalWinFunc: typeof bossGlobal?.winBattle === 'function', hasActive: !!activeBattle });
                        if (!activeBattle) { UI.showNotification('No active battle', 'info'); return; }
                        // prefer engine's runtime method
                        if (runtimeNow && typeof runtimeNow.winBattle === 'function') { console.log('DEBUG: calling runtimeNow.winBattle'); runtimeNow.winBattle(); try { if (typeof runtimeNow.saveGame === 'function') runtimeNow.saveGame(); } catch(e){} UI.showNotification('Forced victory (engine)', 'success'); return; }
                        if (gameGlobal && typeof gameGlobal.winBattle === 'function') { console.log('DEBUG: calling gameGlobal.winBattle'); gameGlobal.winBattle(); try { if (typeof gameGlobal.saveGame === 'function') gameGlobal.saveGame(); } catch(e){} UI.showNotification('Forced victory (GAME global)', 'success'); return; }
                        if (bossGlobal) {
                            const prevCb = bossGlobal.currentBattle;
                            try {
                                const bossObj = activeBattle && activeBattle.boss ? activeBattle.boss : activeBattle;
                                console.log('DEBUG: bossGlobal fallback attempt', { bossObjExists: !!bossObj, prevCbExists: !!prevCb });
                                if (!bossObj) throw new Error('No boss object available for BossBattle context');
                                bossGlobal.currentBattle = bossObj;
                                let calledEnd = false;
                                // Prefer endBattle (it will run the full end flow and schedule cleanup)
                                if (typeof bossGlobal.endBattle === 'function') { console.log('DEBUG: calling bossGlobal.endBattle(true)'); bossGlobal.endBattle(true, bossObj); calledEnd = true; try { if (typeof bossGlobal.saveGame === 'function') bossGlobal.saveGame(); } catch(e){} 
                                    try { if (typeof GAME !== 'undefined' && GAME && GAME.state && GAME.state.currentBattle) { console.log('DEBUG: Marking GAME.state.currentBattle as ended (deferred clear) after BossBattle.endBattle(true)'); GAME.state.currentBattle._ended = true; GAME.state.currentBattle._endExpiresAt = Date.now() + 4000; } } catch(e){}
                                    UI.showNotification('Forced victory (BossBattle.endBattle)', 'success'); try { setTimeout(() => { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); }, 100); } catch(e) {} return; }
                                // Next, try simpler helpers
                                if (typeof bossGlobal.winBattle === 'function') { console.log('DEBUG: calling bossGlobal.winBattle'); bossGlobal.winBattle.call(bossGlobal); try { if (typeof bossGlobal.saveGame === 'function') bossGlobal.saveGame(); } catch(e){} UI.showNotification('Forced victory (BossBattle.winBattle)', 'success'); return; }
                                if (typeof bossGlobal.handleVictory === 'function') { console.log('DEBUG: calling bossGlobal.handleVictory'); bossGlobal.handleVictory.call(bossGlobal); try { if (typeof bossGlobal.saveGame === 'function') bossGlobal.saveGame(); } catch(e){} UI.showNotification('Forced victory (BossBattle.handleVictory)', 'success'); return; }
                            } catch (e) { console.log('DEBUG: bossGlobal victory fallback failed', e); }
                            finally {
                                // Only restore prevCb if endBattle was NOT called
                                try { if (typeof calledEnd === 'undefined' || calledEnd === false) { bossGlobal.currentBattle = prevCb; } } catch(e) { /* ignore */ }
                            }
                        }
                        // last resort: try endBattle(true) or set HP to zero
                        if (runtimeNow && typeof runtimeNow.endBattle === 'function') { console.log('DEBUG: calling runtimeNow.endBattle(true)'); runtimeNow.endBattle(true); try { if (typeof runtimeNow.saveGame === 'function') runtimeNow.saveGame(); } catch(e){} UI.showNotification('Forced victory (endBattle(true))', 'success'); return; }
                        if (bossGlobal && typeof bossGlobal.endBattle === 'function') { console.log('DEBUG: calling bossGlobal.endBattle(true)'); bossGlobal.endBattle(true, bossObj); try { if (typeof bossGlobal.saveGame === 'function') bossGlobal.saveGame(); } catch(e){} UI.showNotification('Forced victory (BossBattle.endBattle)', 'success'); return; }
                        if (activeBattle && activeBattle.boss) {
                            activeBattle.boss.currentHp = 0;
                            console.log('DEBUG: set activeBattle.boss.currentHp = 0 (manual fallback)');
                            if (typeof gameGlobal !== 'undefined' && typeof gameGlobal.updateBattleUI === 'function') gameGlobal.updateBattleUI();
                            if (typeof gameGlobal !== 'undefined' && typeof gameGlobal.saveGame === 'function') try { gameGlobal.saveGame(); } catch(e) {}
                            if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab();
                            UI.showNotification('Forced victory (manual HP zero)', 'success');
                            return;
                        }
                        UI.showNotification('Could not force victory: no handlers found', 'error');
                    } catch (e) { console.log('debugForceWin click failed', e); UI.showNotification('Debug force win failed (check console)', 'error'); }
                });
                if (loseBtn) loseBtn.addEventListener('click', () => {
                    try {
                        const { runtimeNow, gameGlobal, bossGlobal, activeBattle } = resolveRuntimeAndBattle();
                        console.log('DEBUG: Force Lose button clicked', { runtimeExists: !!runtimeNow, runtimeLoseFunc: runtimeNow ? typeof runtimeNow.loseBattle === 'function' : false, gameGlobalLoseFunc: typeof gameGlobal?.loseBattle === 'function', bossGlobalLoseFunc: typeof bossGlobal?.loseBattle === 'function', hasActive: !!activeBattle });
                        if (!activeBattle) { UI.showNotification('No active battle', 'info'); return; }
                        if (runtimeNow && typeof runtimeNow.loseBattle === 'function') { console.log('DEBUG: calling runtimeNow.loseBattle'); runtimeNow.loseBattle(); try { if (typeof runtimeNow.saveGame === 'function') runtimeNow.saveGame(); } catch(e){} UI.showNotification('Forced defeat (engine)', 'warning'); return; }
                        if (gameGlobal && typeof gameGlobal.loseBattle === 'function') { console.log('DEBUG: calling gameGlobal.loseBattle'); gameGlobal.loseBattle(); try { if (typeof gameGlobal.saveGame === 'function') gameGlobal.saveGame(); } catch(e){} UI.showNotification('Forced defeat (GAME global)', 'warning'); return; }
                        if (bossGlobal) {
                            const prevCb = bossGlobal.currentBattle;
                            try {
                                const bossObj = activeBattle && activeBattle.boss ? activeBattle.boss : activeBattle;
                                console.log('DEBUG: bossGlobal fallback attempt', { bossObjExists: !!bossObj, prevCbExists: !!prevCb });
                                if (!bossObj) throw new Error('No boss object available for BossBattle context');
                                bossGlobal.currentBattle = bossObj;
                                let calledEnd = false;
                                if (typeof bossGlobal.endBattle === 'function') { console.log('DEBUG: calling bossGlobal.endBattle(false)'); bossGlobal.endBattle(false, bossObj); try { if (typeof bossGlobal.saveGame === 'function') bossGlobal.saveGame(); } catch(e){} 
                                    try { if (typeof GAME !== 'undefined' && GAME && GAME.state && GAME.state.currentBattle) { console.log('DEBUG: Marking GAME.state.currentBattle as ended (deferred clear) after BossBattle.endBattle(false)'); GAME.state.currentBattle._ended = true; GAME.state.currentBattle._endExpiresAt = Date.now() + 4000;} } catch(e){}
                                    UI.showNotification('Forced defeat (BossBattle.endBattle)', 'warning'); try { setTimeout(() => { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); }, 100); } catch(e) {} return; }
                                if (typeof bossGlobal.endBattle === 'function') { console.log('DEBUG: calling bossGlobal.endBattle(false)'); bossGlobal.endBattle(false, bossObj); calledEnd = true; UI.showNotification('Forced defeat (BossBattle.endBattle)', 'warning'); try { setTimeout(() => { if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab(); }, 100); } catch(e) {} return; }
                                if (typeof bossGlobal.loseBattle === 'function') { console.log('DEBUG: calling bossGlobal.loseBattle'); bossGlobal.loseBattle.call(bossGlobal); try { if (typeof bossGlobal.saveGame === 'function') bossGlobal.saveGame(); } catch(e){} UI.showNotification('Forced defeat (BossBattle.loseBattle)', 'warning'); return; }
                                if (typeof bossGlobal.handleDefeat === 'function') { console.log('DEBUG: calling bossGlobal.handleDefeat'); bossGlobal.handleDefeat.call(bossGlobal); try { if (typeof bossGlobal.saveGame === 'function') bossGlobal.saveGame(); } catch(e){} UI.showNotification('Forced defeat (BossBattle.handleDefeat)', 'warning'); return; }
                            } catch (e) { console.log('DEBUG: bossGlobal defeat fallback failed', e); }
                            finally {
                                try { if (typeof calledEnd === 'undefined' || calledEnd === false) { bossGlobal.currentBattle = prevCb; } } catch(e) { /* ignore */ }
                            }
                        }
                        if (runtimeNow && typeof runtimeNow.endBattle === 'function') { console.log('DEBUG: calling runtimeNow.endBattle(false)'); runtimeNow.endBattle(false); try { if (typeof runtimeNow.saveGame === 'function') runtimeNow.saveGame(); } catch(e){} UI.showNotification('Forced defeat (endBattle(false))', 'warning'); return; }
                        if (bossGlobal && typeof bossGlobal.endBattle === 'function') { console.log('DEBUG: calling bossGlobal.endBattle(false)'); bossGlobal.endBattle(false, bossObj); try { if (typeof bossGlobal.saveGame === 'function') bossGlobal.saveGame(); } catch(e){} UI.showNotification('Forced defeat (BossBattle.endBattle)', 'warning'); return; }
                        if (activeBattle && activeBattle.player) {
                            activeBattle.player.currentHp = 0;
                            console.log('DEBUG: set activeBattle.player.currentHp = 0 (manual fallback)');
                            if (typeof gameGlobal !== 'undefined' && typeof gameGlobal.updateBattleUI === 'function') gameGlobal.updateBattleUI();
                            if (typeof UI !== 'undefined' && typeof UI.setupFightingTab === 'function') UI.setupFightingTab();
                            UI.showNotification('Forced defeat (manual HP zero)', 'warning');
                            return;
                        }
                        UI.showNotification('Could not force defeat: no handlers found', 'error');
                    } catch (e) { console.log('debugForceLose click failed', e); UI.showNotification('Debug force lose failed (check console)', 'error'); }
                });
            }
        } catch (e) { console.log('Failed to wire debug buttons', e); }

        // If a battle is active, start a UI-side interval to update the displayed timer every second
        try {
            if (G.state.currentBattle) {
                const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                // start one interval only
                if (this._fightingInterval) { clearInterval(this._fightingInterval); this._fightingInterval = null; }
                this._fightingInterval = setInterval(() => {
                    try {
                        const b = G.state.currentBattle;
                        if (!b) { if (this._fightingInterval) { clearInterval(this._fightingInterval); this._fightingInterval = null; } return; }
                        const msLeft = Math.max(0, (b.timeLimit || 0) - (Date.now() - (b.startTime || Date.now())));
                        const secLeft = Math.ceil(msLeft / 1000);
                        // update inline battle-timer element
                        const timerEl = container.querySelector('.battle-timer');
                        if (timerEl) timerEl.textContent = `⏰ ${secLeft}s`;
                        // update overlay timer if visible
                        const overlayEl = document.getElementById('bossTimeRemaining');
                        if (overlayEl) overlayEl.textContent = secLeft;

                        // Check for loss conditions and invoke engine handlers if available
                        if (secLeft <= 0 || (b.player && b.player.currentHp <= 0)) {
                            if (runtime && typeof runtime.loseBattle === 'function') {
                                try { runtime.loseBattle(); } catch (e) { console.log('runtime.loseBattle() error', e); }
                            } else if (runtime && typeof runtime.endBattle === 'function') {
                                try { runtime.endBattle(false); } catch (e) { /* ignore */ }
                            } else {
                                // fallback: clear battle state and refresh UI
                                G.state.currentBattle = null;
                                UI.showNotification('Defeat', 'You lost the battle.');
                                this.setupFightingTab();
                            }
                            if (this._fightingInterval) { clearInterval(this._fightingInterval); this._fightingInterval = null; }
                        }
                    } catch (e) {
                        console.log('Fighting timer UI error', e);
                    }
                }, 1000);
            }
        } catch (e) { console.log('Failed to create fighting UI timer', e); }

        // Training section — unlock attacks using skill points
        const trainingSection = document.createElement('div');
        trainingSection.className = 'fighting-training-section';
            trainingSection.innerHTML = `
            <h3>🧠 Training Grounds</h3>
            <p>Spend skill points to train and permanently unlock attacks (persists). You can also buy stamina upgrades and manage your gear here.</p>
            <div class="training-layout">
                <div class="training-grid">
                    ${G.CONFIG.FIGHTING_ATTACKS.map(attack => {
                    // No more manual unlocks: attacks are availability-gated by equipment.
                    return `
                        <div class="training-card" data-attack="${attack.id}">
                            <div class="training-info">
                                <div class="training-name">${attack.name}</div>
                                <div class="training-desc">${attack.description}</div>
                                <div class="training-stats">Damage: ${attack.damage} • Stamina: ${attack.staminaCost || 0} • CD: ${attack.cooldown/1000}s</div>
                            </div>
                            <div class="training-actions">
                                <div class="training-unlocked">🔓 Auto - gated by equipment</div>
                            </div>
                        </div>
                    `;
                }).join('')}
                </div>

                    <div class="training-side">
                    <div class="training-upgrades">
                        <h4>Upgrades</h4>
                        ${Object.entries(G.CONFIG.FIGHTING_UPGRADES).map(([k,cfg]) => {
                            const lvl = (G.getFightingUpgradeLevel && typeof G.getFightingUpgradeLevel === 'function') ? G.getFightingUpgradeLevel(k) : (G.state.fightingUpgrades && G.state.fightingUpgrades[k] ? G.state.fightingUpgrades[k].level : 0);
                            const cost = (G.getFightingUpgradeCost && typeof G.getFightingUpgradeCost === 'function') ? G.getFightingUpgradeCost(k) : Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, lvl));
                            return `
                                <div class="fighting-upgrade-card" data-upgrade="${k}">
                                    <div class="upg-info">
                                        <div class="upg-name">${cfg.name} (Lv ${lvl})</div>
                                        <div class="upg-desc">${cfg.description}</div>
                                    </div>
                                    <button class="upg-buy" ${G.state.coins >= cost ? '' : 'disabled'} data-upgrade="${k}">💰 ${G.formatNumber(cost)}</button>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="training-forge">
                        <h4>🔨 Forge & Inventory (moved)</h4>
                        <p>The recruitment system has been retired — you can now craft gear in the Forge tab.</p>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(trainingSection);

        // Forge section (new) - placed with fighting UI
        const forgeSection = document.createElement('div');
        forgeSection.className = 'fighting-forge-section';
        forgeSection.innerHTML = `
            <h3>🔨 Forge</h3>
            <p>Create swords, axes, bows or armor using materials from the Mines tab and coins.</p>
            <div class="forge-controls">
                <button class="forge-btn" data-cat="sword">🔨 Forge</button>
                <button class="forge-btn" data-cat="axe">🔨 Forge</button>
                <button class="forge-btn" data-cat="bow">🔨 Forge</button>
                <button class="forge-btn" data-cat="armor">🔨 Forge</button>
            </div>
            <div class="forge-preview" id="forgePreviewArea"></div>
            <div class="forge-jobs" id="forgeJobsList"></div>
            <div class="forge-panel" style="display:flex;gap:16px;align-items:flex-start;">
                <div class="forge-left" style="flex:1;min-width:300px;">
                    <div class="card" style="padding:12px;border-radius:8px;background:var(--card-bg, #111);box-shadow:var(--card-shadow, 0 4px 12px rgba(0,0,0,0.4));">
                        <h4>Your Inventory</h4>
                        <div class="inventory-grid" id="forgeInventoryGrid"></div>
                    </div>
                </div>
                <div class="forge-right" style="width:280px;">
                    <div class="card" id="furnaceCard" style="padding:12px;border-radius:8px;background:var(--card-bg, #111);box-shadow:var(--card-shadow, 0 4px 12px rgba(0,0,0,0.4));">
                        <h4>Smeltery 🔥</h4>
                        <div id="furnacePanel">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <div>Iron: <strong><span id="furnaceIronCount">0</span></strong></div>
                                <div>Steel: <strong><span id="furnaceSteelCount">0</span></strong></div>
                            </div>
                            <div class="furnace-row" style="margin-bottom:8px;">Carbon: <strong><span id="furnaceCarbonCount">∞</span></strong></div>
                            <div class="furnace-row" style="margin:8px 0 6px 0;">Produce Steel (queued at 1/sec)</div>
                            <div style="font-size:12px;color:var(--muted,#bbb);margin-bottom:8px;">Power: 100 W per steel</div>
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                <div id="furnaceQueue" style="font-size:12px;color:var(--muted,#bbb);">Queued: 0</div>
                                <button id="furnaceClearQueueBtn" title="Clear queue" style="font-size:12px;padding:2px 6px;">Clear</button>
                            </div>
                            <div class="furnace-actions" style="display:flex;align-items:center;gap:8px;">
                                <button id="furnaceSmeltBtn">Smelt</button>
                                <div class="buy-amount-hint" style="font-size:12px;color:var(--muted,#bbb);">(Shift: x10 | Ctrl: x100 | Ctrl+Shift: MAX)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(forgeSection);

        // Wire subtab switching
        subTabBar.querySelectorAll('.subtab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                subTabBar.querySelectorAll('.subtab-button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const view = btn.dataset.view;
                        if (view === 'battle') {
                    battleSection.style.display = '';
                    trainingSection.style.display = 'none';
                    forgeSection.style.display = 'none';
                    // stop furnace live ticker if running
                    if (this._furnaceInterval) { clearInterval(this._furnaceInterval); this._furnaceInterval = null; }
                } else {
                    battleSection.style.display = 'none';
                    // stop furnace live ticker by default when switching away
                    if (this._furnaceInterval) { clearInterval(this._furnaceInterval); this._furnaceInterval = null; }
                    if (view === 'training') {
                        trainingSection.style.display = '';
                        forgeSection.style.display = 'none';
                    } else if (view === 'forge') {
                        trainingSection.style.display = 'none';
                        forgeSection.style.display = '';
                        // render inventory when opening forge
                        this.renderForgeInventory && this.renderForgeInventory();
                        // update furnace counts immediately and start live ticker
                        const updateFurnaceCounts = () => {
                            const ironEl = document.getElementById('furnaceIronCount');
                            if (ironEl) {
                                const matIron = (GAME.state && GAME.state.materials && GAME.state.materials.iron) ? Math.floor(GAME.state.materials.iron) : 0;
                                const mineIron = (GAME.state && GAME.state.mines && GAME.state.mines.iron && typeof GAME.state.mines.iron.stored !== 'undefined') ? Math.floor(GAME.state.mines.iron.stored) : 0;
                                ironEl.textContent = matIron + mineIron;
                            }
                            const cEl = document.getElementById('furnaceCarbonCount');
                            if (cEl) cEl.textContent = '∞';
                            const steelEl = document.getElementById('furnaceSteelCount');
                            if (steelEl) {
                                const s = (GAME.state && GAME.state.materials && GAME.state.materials.steel) ? Math.floor(GAME.state.materials.steel) : 0;
                                steelEl.textContent = s;
                            }
                            // queued smeltery jobs display
                            const queueEl = document.getElementById('furnaceQueue');
                            if (queueEl) {
                                const jobs = (GAME.state && Array.isArray(GAME.state.smelteryJobs)) ? GAME.state.smelteryJobs : [];
                                const totalQueued = jobs.reduce((sum, j) => sum + (j && j.remaining ? j.remaining : 0), 0);
                                queueEl.textContent = `Queued: ${totalQueued}`;
                                // Toggle smeltery glow based on queued jobs or transient processing
                                try {
                                    const furnaceCard = document.getElementById('furnaceCard');
                                    const transient = (typeof GAME !== 'undefined' && Number(GAME._transientPowerUsage)) ? Number(GAME._transientPowerUsage) : 0;
                                    const active = (totalQueued > 0) || (transient > 0);
                                    if (furnaceCard) furnaceCard.classList.toggle('smelting', !!active);
                                } catch (e) { /* noop */ }
                            }
                        };
                        // expose for engine to update UI after queue changes
                        try { this.updateFurnaceCounts = updateFurnaceCounts; } catch(e) { /* ignore */ }
                        // allow engine to open the Forge/Smeltery view on load
                        try {
                            this.openForgeTab = function() {
                                try {
                                    const btn = document.querySelector('.subtab-button[data-view="forge"]');
                                    if (btn) btn.click();
                                } catch (e) { /* ignore */ }
                            };
                        } catch(e) { /* ignore */ }
                        // run once now
                        updateFurnaceCounts();
                        // start interval to keep UI in sync with engine state
                        if (this._furnaceInterval) { clearInterval(this._furnaceInterval); }
                        this._furnaceInterval = setInterval(updateFurnaceCounts, 1000);
                    }
                }
            });
        });

            // Furnace smelt handler
            try {
                const smeltBtn = forgeSection.querySelector('#furnaceSmeltBtn');
                if (smeltBtn) {
                    smeltBtn.addEventListener('click', (e) => {
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        const matIron = (runtime.state && runtime.state.materials && runtime.state.materials.iron) ? Math.floor(runtime.state.materials.iron) : 0;
                        const mineIron = (runtime.state && runtime.state.mines && runtime.state.mines.iron && typeof runtime.state.mines.iron.stored !== 'undefined') ? Math.floor(runtime.state.mines.iron.stored) : 0;
                        const availableIron = matIron + mineIron;
                        if (availableIron <= 0) return UI.showNotification && UI.showNotification('No Iron', 'You have no iron to smelt.');
                        let amt = this.buyAmount === 'max' ? availableIron : (Number(this.buyAmount) || 1);
                        if (amt === 'max') amt = availableIron;
                        amt = Math.max(0, Math.min(availableIron, Math.floor(amt)));
                        if (amt <= 0) return;
                        // Debug: log click-time state so we can diagnose smelt failures
                        try {
                            const gen = (typeof runtime.getPowerGeneration === 'function') ? runtime.getPowerGeneration() : null;
                            const usage = (typeof runtime.getTotalPowerUsage === 'function') ? runtime.getTotalPowerUsage() : null;
                            const batt = (runtime.state && typeof runtime.state.batteryStored !== 'undefined') ? runtime.state.batteryStored : null;
                            console.log('UI: furnace click - matIron=', matIron, 'mineIron=', mineIron, 'availableIron=', availableIron, 'buyAmount=', this.buyAmount, 'computedAmt=', amt);
                            console.log('UI: furnace power probe - gen=', gen, 'usage=', usage, 'batteryStored=', batt);
                        } catch (e) { console.log('UI: furnace click logging failed', e); }
                        const engineQueue = (runtime && typeof runtime.queueSmelt === 'function') ? runtime.queueSmelt.bind(runtime) : ((typeof BossBattle !== 'undefined' && typeof BossBattle.queueSmelt === 'function') ? BossBattle.queueSmelt.bind(BossBattle) : null);
                        if (engineQueue) {
                            const job = engineQueue(amt);
                            if (job) {
                                UI.showNotification && UI.showNotification('Queued', `Queued ${amt} steel to smelt.`);
                                // immediate UI refresh
                                try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){}
                                const ironEl2 = document.getElementById('furnaceIronCount');
                                if (ironEl2) {
                                    const newMat = (runtime.state && runtime.state.materials && runtime.state.materials.iron) ? Math.floor(runtime.state.materials.iron) : 0;
                                    const newMine = (runtime.state && runtime.state.mines && runtime.state.mines.iron && typeof runtime.state.mines.iron.stored !== 'undefined') ? Math.floor(runtime.state.mines.iron.stored) : 0;
                                    ironEl2.textContent = newMat + newMine;
                                }
                                return;
                            } else {
                                UI.showNotification && UI.showNotification('Smelt failed', 'Could not queue smelt.');
                                return;
                            }
                        }
                        // fallback: try immediate smelt
                        const engineSmelt = (runtime && typeof runtime.smeltSteel === 'function') ? runtime.smeltSteel.bind(runtime) : ((typeof BossBattle !== 'undefined' && typeof BossBattle.smeltSteel === 'function') ? BossBattle.smeltSteel.bind(BossBattle) : null);
                        if (!engineSmelt) {
                            console.log('UI: no smelt function found on GAME or BossBattle');
                            UI.showNotification && UI.showNotification('Smelt failed', 'Engine smelt function not available.');
                            return;
                        }
                        const smelted = engineSmelt(amt);
                        if (smelted > 0) {
                            UI.showNotification && UI.showNotification('Smelted', `Produced ${smelted} steel.`);
                            // refresh UI displays
                            try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){}
                            // update furnace display to combined remaining iron
                            const ironEl2 = document.getElementById('furnaceIronCount');
                            if (ironEl2) {
                                const newMat = (runtime.state && runtime.state.materials && runtime.state.materials.iron) ? Math.floor(runtime.state.materials.iron) : 0;
                                const newMine = (runtime.state && runtime.state.mines && runtime.state.mines.iron && typeof runtime.state.mines.iron.stored !== 'undefined') ? Math.floor(runtime.state.mines.iron.stored) : 0;
                                ironEl2.textContent = newMat + newMine;
                            }
                        } else {
                            UI.showNotification && UI.showNotification('Smelt failed', 'Could not smelt steel.');
                        }
                    });
                }

                // Clear queue button handler
                try {
                    const clearBtn = forgeSection.querySelector('#furnaceClearQueueBtn');
                    if (clearBtn) {
                        clearBtn.addEventListener('click', () => {
                            try {
                                // Prefer global GAME instance
                                const globalGame = (typeof window !== 'undefined' && window.GAME) ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);
                                if (globalGame && typeof globalGame.clearSmelteryQueue === 'function') {
                                    const removed = globalGame.clearSmelteryQueue();
                                    UI.showNotification && UI.showNotification('Queue cleared', `Removed ${removed} jobs from queue.`);
                                    try { if (typeof UI !== 'undefined' && UI.renderForgeInventory) UI.renderForgeInventory(); } catch(e){}
                                    try { if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts(); } catch(e){}
                                    try { const qel = document.getElementById('furnaceQueue'); if (qel) qel.textContent = 'Queued: 0'; } catch(e){}
                                    return;
                                }
                                // Fallback: clear directly on GAME.state if available
                                if (globalGame && globalGame.state && Array.isArray(globalGame.state.smelteryJobs)) {
                                    const removed = globalGame.state.smelteryJobs.length || 0;
                                    globalGame.state.smelteryJobs = [];
                                    try { if (typeof globalGame.saveGame === 'function') globalGame.saveGame(); } catch(e){}
                                    UI.showNotification && UI.showNotification('Queue cleared', `Removed ${removed} jobs from queue.`);
                                    try { if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts(); } catch(e){}
                                    try { const qel = document.getElementById('furnaceQueue'); if (qel) qel.textContent = 'Queued: 0'; } catch(e){}
                                    return;
                                }
                                // BossBattle fallback
                                if (typeof BossBattle !== 'undefined' && BossBattle.state && Array.isArray(BossBattle.state.smelteryJobs)) {
                                    const removed = BossBattle.state.smelteryJobs.length || 0;
                                    BossBattle.state.smelteryJobs = [];
                                    UI.showNotification && UI.showNotification('Queue cleared', `Removed ${removed} jobs from queue.`);
                                    try { if (typeof UI !== 'undefined' && UI.updateFurnaceCounts) UI.updateFurnaceCounts(); } catch(e){}
                                    try { const qel = document.getElementById('furnaceQueue'); if (qel) qel.textContent = 'Queued: 0'; } catch(e){}
                                    return;
                                }
                            } catch (e) {
                                console.log('Clear queue handler error', e);
                            }
                        });
                    }
                } catch(e) { console.log('Furnace clear-queue init failed', e); }
            } catch(e) { console.log('Furnace init failed', e); }

        // Default: show battle, hide training and forge
        battleSection.style.display = '';
        trainingSection.style.display = 'none';
        forgeSection.style.display = 'none';

        // Attack unlock purchasing removed — attacks are gated by equipment now

        // Attach one-time listeners for upgrade buy buttons and old recruitment buttons (retired)
        if (!trainingSection.dataset.listenersAttached) {
            const upgButtons = trainingSection.querySelectorAll('.upg-buy');
            upgButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const key = btn.dataset.upgrade;
                    if (!key) return;

                    const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);
                    const engineBuy = (runtime && typeof runtime.buyFightingUpgrade === 'function') ? runtime.buyFightingUpgrade.bind(runtime) : null;

                    let success = false;
                    if (engineBuy) {
                        success = engineBuy(key);
                    } else {
                        if (!this._fallbackWarnings.has('buyFightingUpgrade')) { console.warn('buyFightingUpgrade missing on engine — UI fallback used (warn once)'); this._fallbackWarnings.add('buyFightingUpgrade'); }
                        const cfg = G.CONFIG.FIGHTING_UPGRADES[key];
                        const lvl = (G.state.fightingUpgrades && G.state.fightingUpgrades[key]) ? G.state.fightingUpgrades[key].level : 0;
                        const cost = Math.floor(cfg.baseCost * Math.pow(cfg.costMultiplier, lvl));
                        if (G.state.coins >= cost) {
                            G.state.coins -= cost;
                            G.state.fightingUpgrades[key] = G.state.fightingUpgrades[key] || { level: 0 };
                            G.state.fightingUpgrades[key].level += 1;
                            if (G.applyFightingUpgrades && typeof G.applyFightingUpgrades === 'function') G.applyFightingUpgrades();
                            success = true;
                        }
                    }

                    if (success) {
                        UI.showNotification('✅ Upgrade Purchased', `${G.CONFIG.FIGHTING_UPGRADES[key].name} upgraded!`);
                        const card = trainingSection.querySelector(`.fighting-upgrade-card[data-upgrade="${key}"]`);
                        if (card) {
                            const newLvl = (G.state.fightingUpgrades && G.state.fightingUpgrades[key]) ? G.state.fightingUpgrades[key].level : 0;
                            card.querySelector('.upg-name').textContent = `${G.CONFIG.FIGHTING_UPGRADES[key].name} (Lv ${newLvl})`;
                            const newCost = (G.getFightingUpgradeCost && typeof G.getFightingUpgradeCost === 'function') ? G.getFightingUpgradeCost(key) : 0;
                            const buyBtn = card.querySelector('.upg-buy');
                            if (buyBtn) {
                                buyBtn.textContent = `💰 ${G.formatNumber(newCost)}`;
                                buyBtn.disabled = !(G.state.coins >= newCost);
                            }
                        }
                        if (runtime && typeof runtime.saveGame === 'function') runtime.saveGame();
                        const bal = document.getElementById('balanceDisplay'); if (bal) bal.textContent = G.formatNumber(G.state.coins);
                        const staminaFill = document.getElementById('fightingStaminaFill'); if (staminaFill) staminaFill.style.width = Math.min(100, ((G.state.fightingStamina || 0) / Math.max(1, G.state.fightingStaminaMax || 1)) * 100) + '%';
                    } else {
                        UI.showNotification('Not enough coins', 'You cannot afford this upgrade');
                    }
                });
            });

            // recruitment UI removed — no unit buy buttons

            trainingSection.dataset.listenersAttached = 'true';

            // Attach forge button handlers and inventory renderer
            try {
                const forgeButtons = forgeSection.querySelectorAll('.forge-btn');

                // Set readable labels for each forge button: "<Item> - <short price>" (e.g. "Sword - 1T")
                try {
                    forgeButtons.forEach(btn => {
                        const cat = btn.dataset.cat || '';
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        const formatShort = (n) => {
                            if (typeof n !== 'number') return (runtime && runtime.formatNumber) ? runtime.formatNumber(n || 0) : String(n || 0);
                            if (n >= 1e12) return `${Math.floor(n / 1e12)}T`;
                            if (n >= 1e9) return `${Math.floor(n / 1e9)}B`;
                            return (runtime && runtime.formatNumber) ? runtime.formatNumber(n) : String(n);
                        };
                        let short = '1T';
                        try {
                            const previewFn = (runtime && typeof runtime.previewForge === 'function') ? runtime.previewForge.bind(runtime) : null;
                            const preview = previewFn ? previewFn(cat) : null;
                            if (preview && typeof preview.coinCost === 'number') short = formatShort(preview.coinCost);
                        } catch (e) { /* ignore preview failures — fallback to 1T */ }
                        const title = cat ? (cat.charAt(0).toUpperCase() + cat.slice(1)) : 'Forge';
                        btn.textContent = `${title} - ${short}`;
                    });
                } catch (e) {}

                forgeButtons.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const cat = btn.dataset.cat;
                        if (!cat) return;
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        const previewArea = document.getElementById('forgePreviewArea');

                        // Use engine preview/start functions. Prefer methods on the shared `GAME` object
                        // so that `this` inside engine calls references the canonical game state.
                        const previewFn = (typeof GAME !== 'undefined' && typeof GAME.previewForge === 'function') ? GAME.previewForge.bind(GAME) : ((runtime && typeof runtime.previewForge === 'function') ? runtime.previewForge.bind(runtime) : null);
                        const startFn = (typeof GAME !== 'undefined' && typeof GAME.startForge === 'function') ? GAME.startForge.bind(GAME) : ((runtime && typeof runtime.startForge === 'function') ? runtime.startForge.bind(runtime) : null);

                                // Show preview (costs & materials) and require confirmation before forging.
                                const preview = previewFn ? previewFn(cat) : null;
                                if (!preview) {
                                    if (previewArea) previewArea.innerHTML = `<div class="forge-anim forging">Cannot preview forge for ${cat}.</div>`;
                                    return;
                                }

                                // Render preview with costs and duration + confirm (DO NOT display rarity)
                                const matLines = Object.entries(preview.materialReq || {}).map(([m,amt]) => {
                                    const inv = (GAME.state.materials && GAME.state.materials[m]) ? GAME.state.materials[m] : 0;
                                    const mineStored = (GAME.state.mines && GAME.state.mines[m]) ? Math.floor(GAME.state.mines[m].stored || 0) : 0;
                                    const stored = inv + mineStored;
                                    return `<div class="forge-mat"><strong>${m}:</strong> ${amt} (you have ${Math.floor(stored)})</div>`;
                                }).join('');

                                if (previewArea) previewArea.innerHTML = `
                                    <div class="forge-preview-detail">
                                        <div><strong>Coin Cost:</strong> 💰 ${GAME.formatNumber(preview.coinCost)}</div>
                                        <div><strong>Materials:</strong></div>
                                        <div class="forge-mats">${matLines}</div>
                                        <div><strong>Time:</strong> ${(preview.durationMs/1000).toFixed(0)}s</div>
                                        <div style="margin-top:8px"><button class="forge-confirm-btn">Confirm Forge</button></div>
                                    </div>
                                `;

                                // Confirm handler: start timed forge if supported, otherwise attempt instant forge
                                const confirmBtn = previewArea ? previewArea.querySelector('.forge-confirm-btn') : null;
                                if (confirmBtn) {
                                    confirmBtn.addEventListener('click', () => {
                                        // Prefer timed start if available
                                        if (startFn) {
                                            if (previewArea) previewArea.innerHTML = `<div class="forge-anim forging">🔨 Forging ${cat}… <span class="forge-flame"></span></div>`;
                                            setTimeout(() => {
                                                const job = startFn(cat, preview);
                                                if (!job) {
                                                    // failed to start — re-render preview so user can see costs again
                                                    if (previewArea) previewArea.innerHTML = `
                                                        <div class="forge-preview-detail">
                                                            <div><strong>Coin Cost:</strong> 💰 ${GAME.formatNumber(preview.coinCost)}</div>
                                                            <div><strong>Materials:</strong></div>
                                                            <div class="forge-mats">${matLines}</div>
                                                            <div style="margin-top:8px"><button class="forge-confirm-btn">Confirm Forge</button></div>
                                                        </div>
                                                    `;
                                                    return;
                                                }

                                                // show job progress (do NOT reveal rarity during progress)
                                                const showProgress = () => {
                                                    const remaining = Math.max(0, Math.ceil((job.completeAt - Date.now())/1000));
                                                    if (previewArea) previewArea.innerHTML = `<div class="forge-anim forging">Forging ${job.category} — ${remaining}s</div>`;
                                                    if (remaining <= 0) {
                                                        this.renderForgeInventory && this.renderForgeInventory();
                                                        if (typeof runtime.saveGame === 'function') runtime.saveGame();
                                                        try { if (previewArea) previewArea.innerHTML = ''; } catch(e) {}
                                                        return;
                                                    }
                                                    setTimeout(showProgress, 800);
                                                };
                                                showProgress();
                                            }, 300);
                                            return;
                                        }

                                        // No timed start available — try instant forge via forgeItem
                                        const instantFn = (typeof GAME !== 'undefined' && typeof GAME.forgeItem === 'function') ? GAME.forgeItem.bind(GAME) : null;
                                        if (!instantFn) return UI.showNotification('Forge unavailable', 'Engine does not support forging here.');
                                        const item = instantFn(cat);
                                        if (!item) return; // engine will notify on failure
                                        // render inventory after instant forge (engine shows notification)
                                        this.renderForgeInventory && this.renderForgeInventory();
                                        if (typeof runtime.saveGame === 'function') runtime.saveGame();
                                    });
                                }
                    });
                });

                // render function placed on UI instance
                this.renderForgeInventory = () => {
                    const grid = document.getElementById('forgeInventoryGrid');
                    if (!grid) return;
                    try { console.log('renderForgeInventory: starting, GAME.state.inventory.length=', (GAME && GAME.state && Array.isArray(GAME.state.inventory)) ? GAME.state.inventory.length : 0, 'forgeJobs=', (GAME && GAME.state && Array.isArray(GAME.state.forgeJobs)) ? GAME.state.forgeJobs.length : 0); } catch(e){}
                    grid.innerHTML = '';
                    // Show smeltery active indicator on the smeltery card when processing
                    try {
                        const active = (typeof GAME !== 'undefined' && Number(GAME._transientPowerUsage) > 0);
                        const furnaceCard = document.getElementById('furnaceCard');
                        if (furnaceCard) furnaceCard.classList.toggle('smelting', !!active);
                    } catch (e) { /* noop */ }
                    // Ensure any expired jobs are completed (handle reload/resume cases)
                    const jobs = (GAME && GAME.state && Array.isArray(GAME.state.forgeJobs)) ? GAME.state.forgeJobs.slice() : [];
                    if (jobs.length > 0) {
                        jobs.forEach(j => {
                            if (j.completeAt && Date.now() >= j.completeAt) {
                                try { GAME.completeForgeJob && GAME.completeForgeJob(j.id); } catch (e) { console.log('completeForgeJob failed', e); }
                            }
                        });
                    }

                    const inv = (GAME && GAME.state && Array.isArray(GAME.state.inventory)) ? GAME.state.inventory : [];
                    try { console.log('renderForgeInventory: inv ids=', inv.map(i => i.id)); } catch(e){}

                    // Render active jobs area
                    const jobsListContainer = document.getElementById('forgeJobsList');
                    if (jobsListContainer) {
                        jobsListContainer.innerHTML = '';
                        const jobsCur = (GAME.state.forgeJobs || []).slice().reverse();
                        if (jobsCur.length === 0) {
                            // No active forge jobs — intentionally leave the area empty
                            jobsListContainer.innerHTML = '';
                        } else {
                            jobsCur.forEach(j => {
                                const remaining = Math.max(0, Math.ceil((j.completeAt - Date.now())/1000));
                                const jobEl = document.createElement('div'); jobEl.className = 'forge-job';
                                jobEl.innerHTML = `<div><strong>${j.category}</strong> — ${remaining}s</div>`;
                                jobsListContainer.appendChild(jobEl);
                            });
                        }
                    }
                    if (inv.length === 0) {
                        grid.innerHTML = `<div class="inventory-empty">No items yet — forge one!</div>`;
                        return;
                    }
                    // Ensure equipment panel exists (slots for quick drag/drop)
                    let equipPanel = document.getElementById('equipmentPanel');
                    if (!equipPanel) {
                        equipPanel = document.createElement('div');
                        equipPanel.id = 'equipmentPanel';
                        equipPanel.className = 'equipment-panel';
                        equipPanel.innerHTML = `
                            <div class="equip-slot-wrapper">
                                <div class="slot-label">Weapon</div>
                                <div class="equip-slot" data-slot="weapon"></div>
                            </div>
                            <div class="equip-slot-wrapper">
                                <div class="slot-label">Bow</div>
                                <div class="equip-slot" data-slot="bow"></div>
                            </div>
                            <div class="equip-slot-wrapper">
                                <div class="slot-label">Helmet</div>
                                <div class="equip-slot" data-slot="helmet"></div>
                            </div>
                            <div class="equip-slot-wrapper">
                                <div class="slot-label">Chestplate</div>
                                <div class="equip-slot" data-slot="chestplate"></div>
                            </div>
                            <div class="equip-slot-wrapper">
                                <div class="slot-label">Leggings</div>
                                <div class="equip-slot" data-slot="leggings"></div>
                            </div>
                            <div class="equip-slot-wrapper">
                                <div class="slot-label">Boots</div>
                                <div class="equip-slot" data-slot="boots"></div>
                            </div>
                        `;
                        grid.parentNode && grid.parentNode.insertBefore(equipPanel, grid);
                    }

                    // Helper: render contents of equip slots and attach drop/click handlers
                    try {
                        const slots = ['weapon','bow','helmet','chestplate','leggings','boots'];
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        const renderSlot = (slot) => {
                            const slotEl = equipPanel.querySelector(`.equip-slot[data-slot="${slot}"]`);
                            if (!slotEl) return;
                            // clear existing handlers to avoid double-binding
                            slotEl.replaceWith(slotEl.cloneNode(true));
                        };
                        slots.forEach(s => renderSlot(s));

                        const attachHandlers = (slot) => {
                            const slotEl = equipPanel.querySelector(`.equip-slot[data-slot="${slot}"]`);
                            if (!slotEl) return;
                            // Render current equipped item (if any)
                            try {
                                const equippedId = (runtime && runtime.state && runtime.state.equipped) ? runtime.state.equipped[slot] : null;
                                slotEl.innerHTML = '';
                                slotEl.classList.remove('has-item');
                                if (equippedId) {
                                    const item = (runtime && runtime.state && Array.isArray(runtime.state.inventory)) ? runtime.state.inventory.find(i=>i.id===equippedId) : null;
                                    if (item) {
                                        slotEl.innerHTML = `<div class="equip-slot-inner"><div class="inv-icon">${item.icon}</div></div>`;
                                        slotEl.classList.add('has-item');
                                    }
                                } else {
                                    slotEl.innerHTML = '<div class="slot-empty">+</div>';
                                }
                            } catch(e) { console.warn('render equip slot failed', e); }

                            // Click to unequip
                            slotEl.addEventListener('click', (ev) => {
                                ev.stopPropagation();
                                try {
                                    const rt = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                                    if (rt && rt.state && rt.state.equipped && rt.state.equipped[slot]) {
                                        if (typeof rt.unequipItem === 'function') rt.unequipItem(slot);
                                        else if (typeof rt.equipItem === 'function') {
                                            // fallback: try to set equipped to null
                                            rt.state.equipped[slot] = null;
                                        }
                                        if (typeof rt.saveGame === 'function') rt.saveGame();
                                        if (typeof UI.renderForgeInventory === 'function') UI.renderForgeInventory();
                                    }
                                } catch(e) { console.warn('unequip failed', e); }
                            });

                            // Drag over / drop handlers
                            slotEl.addEventListener('dragover', (ev) => { ev.preventDefault(); slotEl.classList.add('drag-over'); ev.dataTransfer.dropEffect = 'move'; });
                            slotEl.addEventListener('dragleave', (ev) => { slotEl.classList.remove('drag-over'); });
                            slotEl.addEventListener('drop', (ev) => {
                                ev.preventDefault(); slotEl.classList.remove('drag-over');
                                try {
                                    const id = ev.dataTransfer && ev.dataTransfer.getData('text/plain');
                                    if (!id) return;
                                    const rt = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                                    const inv = (rt && rt.state && Array.isArray(rt.state.inventory)) ? rt.state.inventory : [];
                                    const item = inv.find(i=>i.id === id);
                                    if (!item) return;
                                    // Determine allowed slot for this item
                                    let expected = null;
                                    if (item.category === 'bow') expected = 'bow';
                                    if (item.category === 'sword' || item.category === 'axe') expected = 'weapon';
                                    if (item.category === 'armor') {
                                        const s = String(item.subtype||'').toLowerCase();
                                        if (s.includes('helmet')) expected = 'helmet';
                                        else if (s.includes('chest')) expected = 'chestplate';
                                        else if (s.includes('legging')) expected = 'leggings';
                                        else if (s.includes('boot')) expected = 'boots';
                                    }
                                    if (!expected || expected !== slot) return;
                                    if (rt && typeof rt.equipItem === 'function') rt.equipItem(id);
                                    else {
                                        // fallback set
                                        if (!rt.state.equipped) rt.state.equipped = {};
                                        rt.state.equipped[slot] = id;
                                    }
                                    if (typeof rt.saveGame === 'function') rt.saveGame();
                                    if (typeof UI.renderForgeInventory === 'function') UI.renderForgeInventory();
                                } catch(e) { console.warn('drop handler failed', e); }
                            });
                        };

                        // Attach handlers for each slot
                        ['weapon','bow','helmet','chestplate','leggings','boots'].forEach(s => attachHandlers(s));
                    } catch(e) { console.warn('equip panel handlers setup failed', e); }
                    // sort: Equipped first, then by rarity (highest first), then by category then subtype
                    const rarityOrder = (GAME && GAME.RARITY_TIERS) ? GAME.RARITY_TIERS.map(r=>r.id) : ['crude','basic','advanced','master','ai_improved','godlike'];
                    // build equipped set for quick lookup
                    const equippedSet = new Set();
                    try { if (GAME && GAME.state && GAME.state.equipped) Object.values(GAME.state.equipped).forEach(v=>v && equippedSet.add(v)); } catch(e) {}
                    const sorted = (inv || []).slice().sort((a,b) => {
                        const aEq = equippedSet.has(a.id) ? 1 : 0;
                        const bEq = equippedSet.has(b.id) ? 1 : 0;
                        if (aEq !== bEq) return bEq - aEq; // equipped items come first

                        const ai = Math.max(0, rarityOrder.indexOf(a.rarity));
                        const bi = Math.max(0, rarityOrder.indexOf(b.rarity));
                        if (ai !== bi) return bi - ai; // higher rarity first

                        // then by category then subtype
                        if (a.category !== b.category) return a.category.localeCompare(b.category);
                        return String(a.subtype || '').localeCompare(String(b.subtype || ''));
                    });
                    sorted.forEach(item => {
                        try { console.log('renderForgeInventory: rendering item', item.id, item.subtype, item.rarityLabel); } catch(e){}
                        const isEquipped = (GAME.state.equipped.weapon === item.id) || (GAME.state.equipped.bow === item.id) || [GAME.state.equipped.helmet, GAME.state.equipped.chestplate, GAME.state.equipped.leggings, GAME.state.equipped.boots].includes(item.id);
                        const card = document.createElement('div'); card.className = 'inventory-card' + (item.rarity ? ` rarity-${String(item.rarity).toLowerCase()}` : '') + (isEquipped ? ' equipped' : '');
                        card.setAttribute('draggable', 'true');
                        card.dataset.id = item.id;
                        // compute sell price for display
                        let sellPrice = 0;
                        try {
                            const baseMat = (GAME && GAME._baseMaterialsForCategory) ? GAME._baseMaterialsForCategory(item.category) : {};
                            let matValue = 0;
                            for (const [m,amt] of Object.entries(baseMat)) {
                                const v = (GAME && GAME.MATERIAL_VALUE && GAME.MATERIAL_VALUE[m]) ? GAME.MATERIAL_VALUE[m] : 1;
                                matValue += (v * (amt || 0));
                            }
                            const baseItemValue = (item.stat || 1) * 12;
                            const rarityMult = (GAME && GAME.RARITY_SELL_MULT && item.rarity) ? (GAME.RARITY_SELL_MULT[item.rarity] || 1.0) : 1.0;
                            sellPrice = Math.max(1, Math.floor((baseItemValue + matValue) * rarityMult));
                        } catch (e) { sellPrice = 0; }

                        card.innerHTML = `
                            <div class="inv-icon">${item.icon}</div>
                            <div class="inv-info">
                                <div class="inv-name">${item.rarityLabel} ${item.subtype}</div>
                                <div class="inv-stats">${item.category === 'armor' ? 'DEF: ' + item.stat : 'ATK: ' + item.stat}</div>
                            </div>
                            <div class="inv-actions">
                                <button class="equip-btn" data-id="${item.id}">${isEquipped ? 'Unequip' : 'Equip'}</button>
                                <button class="sell-btn" data-id="${item.id}">Sell (${GAME.formatNumber(sellPrice)})</button>
                            </div>
                        `;
                        grid.appendChild(card);
                        // Drag start
                        card.addEventListener('dragstart', (ev) => {
                            ev.dataTransfer && ev.dataTransfer.setData('text/plain', item.id);
                            ev.dataTransfer && (ev.dataTransfer.effectAllowed = 'move');
                        });
                    });

                    // Bind equip buttons
                    grid.querySelectorAll('.equip-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = btn.dataset.id;
                            if (!id) return;
                            const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                            const invItem = runtime.state.inventory.find(i => i.id === id);
                            if (!invItem) return;
                            let slot = null;
                            if (invItem.category === 'bow') slot = 'bow';
                            if (invItem.category === 'sword' || invItem.category === 'axe') slot = 'weapon';
                            if (invItem.category === 'armor') {
                                const s = invItem.subtype.toLowerCase();
                                if (s.includes('helmet')) slot = 'helmet';
                                if (s.includes('chest') || s.includes('chestplate')) slot = 'chestplate';
                                if (s.includes('legging')) slot = 'leggings';
                                if (s.includes('boot')) slot = 'boots';
                            }
                            if (!slot) return;
                            if (runtime.state.equipped[slot] === id) runtime.unequipItem(slot); else runtime.equipItem(id);
                            this.renderForgeInventory();
                            if (runtime.saveGame) runtime.saveGame();
                        });
                    });

                    // Bind sell buttons
                    grid.querySelectorAll('.sell-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = btn.dataset.id;
                            if (!id) return;
                            const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                            try {
                                const gained = runtime.sellItem(id);
                                if (gained) {
                                    // refresh UI
                                    runtime.saveGame && runtime.saveGame();
                                    this.renderForgeInventory && this.renderForgeInventory();
                                    const bal = document.getElementById('balanceDisplay'); if (bal) bal.textContent = runtime.formatNumber(runtime.state.coins);
                                }
                            } catch (e) { console.log('sell failed', e); }
                        });
                    });

                    // Attach drop handlers to equipment slots
                    const slots = document.querySelectorAll('#equipmentPanel .equip-slot');
                    slots.forEach(slotEl => {
                        const slotName = slotEl.dataset.slot;
                        slotEl.addEventListener('dragover', (ev) => { ev.preventDefault(); slotEl.classList.add('drag-over'); });
                        slotEl.addEventListener('dragleave', (ev) => { slotEl.classList.remove('drag-over'); });
                        slotEl.addEventListener('drop', (ev) => {
                            ev.preventDefault(); slotEl.classList.remove('drag-over');
                            const id = ev.dataTransfer && ev.dataTransfer.getData('text/plain');
                            if (!id) return;
                            const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                            // Validate item/category matches slot
                            const item = (runtime.state.inventory || []).find(i => i.id === id);
                            if (!item) return;
                            const cat = item.category;
                            let ok = false;
                            if (slotName === 'weapon') ok = (cat === 'sword' || cat === 'axe');
                            else if (slotName === 'bow') ok = (cat === 'bow');
                            else ok = (cat === 'armor' && item.subtype && String(item.subtype).toLowerCase().includes(slotName.replace('plate','')));
                            if (!ok) return UI.showNotification && UI.showNotification('Invalid Slot', 'This item cannot be placed in that slot.');
                            try { runtime.equipItem(id); } catch(e) { console.log('equip via drop failed', e); }
                            this.renderForgeInventory && this.renderForgeInventory();
                        });
                    });
                };
            } catch (e) { console.log('Forge UI attachments failed', e); }
        }

        

            // Attach listeners for attack buttons (if any) — enforce turn and equipment gating at click time
        const attackBtns = battleSection.querySelectorAll('.attack-button');
        // highlight queued action (if any)
        try {
            const queued = battle.playerAction ? battle.playerAction.id : null;
            attackBtns.forEach(b => { if (queued && b.dataset.attack === queued) b.classList.add('action-queued'); });
        } catch(e) {}

        attackBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attackId = btn.dataset.attack;
                if (!attackId) return;
                // Prefer the runtime engine implementation if available, fall back to local UI logic only when necessary
                // Dynamically resolve the runtime engine object at click time (avoid stale closure referencing `G`)
                const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);
                // (Removed misplaced locked check; this is attack-button handler, not boss-click handler)
                const engineExecute = (runtime && typeof runtime.executeAttack === 'function') ? runtime.executeAttack.bind(runtime) : null;
                if (!engineExecute) {
                    if (!this._fallbackWarnings.has('executeAttack')) {
                        console.warn('executeAttack not available on engine — UI fallback active (will only warn once)');
                        this._fallbackWarnings.add('executeAttack');
                    }

                    // Fallback attack execution (mirrors GAME.executeAttack logic)
                    const battle = G && G.state ? G.state.currentBattle : null;
                    if (!battle) return UI.showNotification('No active battle', 'Start a boss fight first');

                    const attack = G && G.CONFIG ? G.CONFIG.FIGHTING_ATTACKS.find(a => a.id === attackId) : null;
                    if (!attack) return UI.showNotification('Error', 'Attack not found');

                    // Check unlock gating via equipment (engine helper preferred)
                    if (G.isAttackUnlocked && typeof G.isAttackUnlocked === 'function') {
                        try { if (!G.isAttackUnlocked(attackId)) return UI.showNotification('🔒 Attack Locked', 'This ability requires specific equipment to use.'); } catch (e) { console.log('isAttackUnlocked error', e); }
                    }

                    // Turn check
                    if (battle.turn && battle.turn !== 'player') return UI.showNotification('⏳ Not your turn', 'Wait until it is your turn to act.');

                    // Stamina check
                    const cost = attack.staminaCost || 0;
                    if (cost > 0 && (!G.state || (G.state.fightingStamina || 0) < cost)) {
                        return UI.showNotification('🔋 Not enough stamina', 'You need more stamina to use this ability.');
                    }

                    // Cooldown check
                    const lastUsed = battle.attacksUsed.find(a => a.id === attackId);
                    const cooldown = lastUsed ? Math.max(0, attack.cooldown - (Date.now() - lastUsed.time)) : 0;
                    if (cooldown > 0) return UI.showNotification('⏰ Cooldown', 'This attack is on cooldown!');

                    // Queue the player's action for a simultaneous initiative round
                    battle.playerAction = { id: attackId, attack: attack };
                    // populate a small initiative avatar to show player action being queued
                    try {
                        const p = document.getElementById('initiativePlayerAvatar');
                        if (p) {
                            p.innerHTML = `
                                <div class="cartoon-human">
                                    <div class="human-head">
                                        <div class="human-hair"></div>
                                        <div class="human-eyes"><div class="eye left"></div><div class="eye right"></div></div>
                                        <div class="human-mouth"></div>
                                    </div>
                                </div>`;
                        }
                    } catch(e) {}
                    // Visual: play a small player attack animation
                    try {
                        const battleSection = document.querySelector('.fighting-battle-section');
                        if (battleSection) {
                            battleSection.classList.add('player-attack');
                            setTimeout(() => battleSection.classList.remove('player-attack'), 800);
                        }
                    } catch(e) { console.log('player animation fallback error', e); }
                    // Play a matching player sound
                    try { this.playSound('player_strike'); } catch(e) { console.log('player sound fallback error', e); }

                    // Visual: play a small player attack animation
                    try {
                        const battleSection = document.querySelector('.fighting-battle-section');
                        if (battleSection) {
                            battleSection.classList.add('player-attack');
                            setTimeout(() => battleSection.classList.remove('player-attack'), 800);
                        }
                    } catch(e) { console.log('player animation fallback error', e); }
                    // Play a matching player sound
                    try { this.playSound('player_strike'); } catch(e) { console.log('player sound fallback error', e); }

                    // Deduct stamina
                    if (cost > 0 && G && G.state) {
                        G.state.fightingStamina = Math.max(0, (G.state.fightingStamina || 0) - cost);
                    }

                    // (stamina already deducted above)

                    // If boss action is not chosen yet, let AI pick one now
                    if (!battle.bossAction) {
                        let selected = null;
                        if (G && typeof G.selectBossAction === 'function') selected = G.selectBossAction(battle);
                        if (!selected) selected = (G && G.CONFIG && Array.isArray(G.CONFIG.FIGHTING_ATTACKS)) ? G.CONFIG.FIGHTING_ATTACKS.find(a => a.actionCategory === 'light') : null;
                        battle.bossAction = { id: selected ? selected.id : null, attack: selected };
                    }

                    // mark round resolving and schedule a local resolution (engine.resolveRound will run if available)
                    battle.turn = 'resolving';
                    setTimeout(() => {
                        // Prefer engine resolution if available
                        if (G && typeof G.resolveRound === 'function') {
                            try { G.resolveRound(); } catch (e) { console.log('resolveRound error', e); }
                        } else {
                            // Minimal local resolver mirroring engine.resolveRound
                            const playerAct = battle.playerAction && battle.playerAction.attack;
                            const bossAct = battle.bossAction && battle.bossAction.attack;
                            if (!playerAct || !bossAct) return UI.showNotification('Error', 'Could not resolve actions');

                            // execute in speed order
                            const order = [ { who: 'player', a: playerAct, speed: playerAct.speed || 600 }, { who: 'boss', a: bossAct, speed: bossAct.speed || 600 } ];
                            order.sort((x,y) => (x.speed === y.speed ? (Math.random()>0.5?1:-1) : x.speed - y.speed));

                            for (const item of order) {
                                // if boss/player already dead, skip
                                if ((item.who === 'player' && battle.player.currentHp <= 0) || (item.who === 'boss' && battle.boss.currentHp <= 0)) continue;
                                // very simple execution: damage same as earlier fallback
                                if (item.a.actionCategory === 'defend') {
                                    if (item.who === 'player') {
                                        battle.player.blocking = !!(item.a.effect && item.a.effect.reduceDamagePct);
                                        battle.player.dodging = !!(item.a.effect && item.a.effect.dodgeChance);
                                        battle.battleLog.push(`You brace (${item.a.name})`);
                                    } else {
                                        if (battle.boss) { battle.boss.blocking = !!(item.a.effect && item.a.effect.reduceDamagePct); battle.boss.dodging = !!(item.a.effect && item.a.effect.dodgeChance); battle.battleLog.push(`${battle.boss.name} braces`); }
                                    }
                                    continue;
                                }
                                // apply damage
                                let dmg = item.a.damage || 0;
                                if (item.who === 'player') {
                                    // prefer runtime calc if available
                                    const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);
                                    let pAttack = (battle.player && battle.player.attack) ? battle.player.attack : 0;
                                    try {
                                        if (runtime && typeof runtime.calculatePlayerCombatStats === 'function') {
                                            const s = runtime.calculatePlayerCombatStats();
                                            if (s && typeof s.attack === 'number') pAttack = s.attack;
                                        }
                                    } catch (e) { /* ignore */ }
                                    dmg = (item.a.damage || 0) + (pAttack || 0);
                                    const playerStats = battle.player;
                                    if (Math.random() < (playerStats.critChance || 0)) dmg *= 2;
                                    if (Math.random() > item.a.accuracy) dmg = 0;
                                    dmg = Math.floor(dmg);
                                    battle.boss.currentHp = Math.max(0, (battle.boss.currentHp || 0) - dmg);
                                    battle.attacksUsed.push({ id: item.a.id, time: Date.now() });
                                    battle.battleLog.push(`${item.a.name} deals ${dmg} damage`);
                                } else {
                                    // boss hit
                                    if (Math.random() > item.a.accuracy) dmg = 0;
                                    dmg = Math.floor(dmg - ((battle.player.defense || 0) * 0.1));
                                    // minimum boss damage
                                    const minD = Math.ceil((battle.boss.attack || 50) * 0.4);
                                    dmg = Math.max(minD, dmg);
                                    battle.player.currentHp = Math.max(0, (battle.player.currentHp || 0) - dmg);

                                // After each attack, if someone hit 0 HP, resolve the outcome immediately
                                try {
                                    const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                                    if (battle.boss.currentHp <= 0) {
                                        // show victory (prefer runtime)
                                        if (runtime && typeof runtime.winBattle === 'function') {
                                            // mark a per-battle flag to prevent further resolver processing
                                            try { if (battle) battle._ended = true; } catch(e){}
                                            runtime.winBattle();
                                        } else {
                                            // fallback: render victory overlay directly
                                            const overlay = document.getElementById('bossVictoryOverlay');
                                            if (overlay) {
                                                const vName = document.getElementById('victoryBossName');
                                                const vSP = document.getElementById('victorySkillPoints');
                                                const vCoins = document.getElementById('victoryCoins');
                                                if (vName) vName.textContent = battle.boss.name;
                                                if (vSP) vSP.textContent = '0';
                                                if (vCoins) vCoins.textContent = '0';
                                                overlay.classList.remove('hidden');
                                            }
                                        }
                                        // ensure UI refreshed
                                        this.setupFightingTab();
                                        return;
                                    }
                                    if (battle.player.currentHp <= 0) {
                                        if (runtime && typeof runtime.loseBattle === 'function') {
                                            try { if (battle) battle._ended = true; } catch(e){}
                                            runtime.loseBattle();
                                        } else {
                                            const overlay = document.getElementById('bossDefeatOverlay');
                                            if (overlay) {
                                                const dName = document.getElementById('defeatBossName');
                                                const dPenalty = document.getElementById('defeatPenalty');
                                                if (dName) dName.textContent = battle.boss.name;
                                                if (dPenalty) dPenalty.textContent = '0';
                                                overlay.classList.remove('hidden');
                                            }
                                        }
                                        this.setupFightingTab();
                                        return;
                                    }
                                } catch (e) { console.log('fallback immediate resolve error', e); }
                                    battle.attacksUsed.push({ id: item.a.id, time: Date.now() });
                                    battle.battleLog.push(`${battle.boss.name} hits for ${dmg}`);
                                }
                            }

                            // cleanup
                            delete battle.playerAction; delete battle.bossAction;
                            battle.turn = 'player';
                            // quick check-end
                            try { if (G && typeof G.checkBattleEnd === 'function') G.checkBattleEnd(); } catch(e){}
                        }
                        // refresh UI and persist
                        UI.setupFightingTab();
                        try { if (G && typeof G.saveGame === 'function') G.saveGame(); } catch (e) {}
                    }, 650);
                    return;
                    } else {
                    engineExecute(attackId);
                }
                // refresh UI after attack
                this.setupFightingTab();
                // (removed) no emergency force-exit element — run away UI covers this
            });
        });

        // Attach listener for in-tab run away button (if present)
        const runInline = battleSection.querySelector('#fightingRunBtn');
        if (runInline) {
            runInline.addEventListener('click', () => {
                const overlay = document.getElementById('bossRunConfirmOverlay'); if (overlay) overlay.classList.remove('hidden');
            });
        }

        // Attach listeners for boss cards (if any)
        const bossCards = battleSection.querySelectorAll('.boss-card');
        bossCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const bossId = card.dataset.boss;
                if (!bossId) return;
                const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : (typeof GAME !== 'undefined' ? GAME : null);
                // Disallow starting a locked boss via UI
                try {
                        const bossCfg = G && G.CONFIG && Array.isArray(G.CONFIG.FIGHTING_BOSSES) ? G.CONFIG.FIGHTING_BOSSES.find(b => b.id === bossId) : null;
                        const bossIdx = G && G.CONFIG && Array.isArray(G.CONFIG.FIGHTING_BOSSES) ? G.CONFIG.FIGHTING_BOSSES.findIndex(b => b.id === bossId) : -1;
                        const prevBoss = (bossIdx > 0 && G && G.CONFIG && G.CONFIG.FIGHTING_BOSSES[bossIdx-1]) ? G.CONFIG.FIGHTING_BOSSES[bossIdx-1] : null;
                        // Determine locked state for clicks. Prefer authoritative `G.isBossUnlocked()` when present;
                        // otherwise, for `crude_ai` allow random-spawn defeats to unlock it.
                        let locked;
                        if (G && typeof G.isBossUnlocked === 'function') {
                            locked = !G.isBossUnlocked(bossId);
                        } else if (bossId === 'crude_ai') {
                            const state = (G && G.state) ? G.state : null;
                            const unlockedSet = state && state.unlockedBosses ? state.unlockedBosses : null;
                            const unlockedViaSet = unlockedSet && (typeof unlockedSet.has === 'function' ? unlockedSet.has('crude_ai') : Array.isArray(unlockedSet) && unlockedSet.includes('crude_ai'));
                            const unlockedViaRandom = state && (state.randomAIDefeats || 0) >= 2;
                            locked = !(unlockedViaSet || unlockedViaRandom);
                        } else {
                            locked = !(G && G.isBossUnlocked && G.isBossUnlocked(bossId));
                        }
                        if (locked) {
                        const counts = G && G.state && G.state.fightingProgressCounts ? G.state.fightingProgressCounts : {};
                        const defeats = prevBoss ? (counts[prevBoss.id] || 0) : (counts[bossId] || 0);
                        const need = prevBoss ? (prevBoss.progressionDefeatRequirement || 0) : (bossCfg && bossCfg.progressionDefeatRequirement ? bossCfg.progressionDefeatRequirement : (bossCfg && bossCfg.unlockRequirement ? bossCfg.unlockRequirement : 0));
                        // Special case: Crude AI unlocks via random spawn defeats
                        if (bossId === 'crude_ai') {
                            const r = (G && G.state && typeof G.state.randomAIDefeats === 'number') ? G.state.randomAIDefeats : 0;
                            const needed = 2;
                            const remaining = Math.max(0, needed - r);
                            UI.showNotification('🔒 Crude AI Locked', `Defeat ${remaining} more random AIs to unlock Crude AI`);
                            return;
                        }
                        UI.showNotification('🔒 Boss Locked', `${prevBoss ? `Defeat ${prevBoss.name} ${need - defeats} more times to unlock ${bossCfg ? bossCfg.name : 'this boss'}` : `Defeat ${need - defeats} more times to unlock`}`);
                        return;
                    }
                } catch (e) { console.warn('Error checking boss locked state on click', e); }
                const engineStart = (runtime && typeof runtime.startBossBattle === 'function') ? runtime.startBossBattle.bind(runtime) : null;
                    if (!engineStart) {
                    if (!this._fallbackWarnings.has('startBossBattle')) {
                        console.warn('startBossBattle not available on engine — UI fallback active (will only warn once)');
                        this._fallbackWarnings.add('startBossBattle');
                    }
                        console.log('UI: fallback startBossBattle for bossId', bossId);
                    // Fallback: if startBossBattle isn't available, manually set up currentBattle using config
                    const bossConfig = G && G.CONFIG && Array.isArray(G.CONFIG.FIGHTING_BOSSES) ? G.CONFIG.FIGHTING_BOSSES.find(b => b.id === bossId) : null;
                    if (!bossConfig) {
                        UI.showNotification('Error', 'Boss configuration not found');
                        return;
                    }

                    const playerStats = (G && typeof G.calculatePlayerCombatStats === 'function') ? G.calculatePlayerCombatStats() : { attack: 100, defense: 50, maxHp: 1000, critChance: 0 };

                    // If challenging GOD AI via UI fallback, confirm with the player that a random server will be stolen on defeat
                    if (bossConfig && bossConfig.id === 'god_ai') {
                        const confirmMsg = 'Warning: Challenging GOD AI is risky — if you lose, a random owned server will be stolen. Proceed?';
                        try {
                            const ok = (typeof window !== 'undefined' && typeof window.confirm === 'function') ? window.confirm(confirmMsg) : true;
                            if (!ok) return;
                        } catch (e) { /* ignore and proceed */ }
                    }

                    G.state.currentBattle = {
                        boss: { ...bossConfig, currentHp: bossConfig.health, maxHp: bossConfig.health },
                        player: { ...playerStats, currentHp: playerStats.maxHp },
                        battleLog: [],
                        attacksUsed: [],
                        startTime: Date.now(),
                        timeLimit: (bossConfig.timeLimit || 30000)
                    };
                    // Mark random-server-steal risk for UI fallback battles vs GOD AI so loseBattle can act
                    try { if (bossConfig && bossConfig.id === 'god_ai' && G.state.currentBattle) { if (!G.state.currentBattle.risk) G.state.currentBattle.risk = {}; G.state.currentBattle.risk.randomServerSteal = true; } } catch(e) {}
                    // Ensure legacy BossBattle runtime references are updated so end/force-win helpers can act
                    try { if (typeof BossBattle !== 'undefined') BossBattle.currentBattle = G.state.currentBattle; } catch (e) {}
                    try { G.currentBattle = G.state.currentBattle; } catch(e) {}
                    // Start a UI-side fallback timer to enforce timeouts when engine startBattle isn't available
                    try {
                        if (this._fallbackBattleTimer) { clearInterval(this._fallbackBattleTimer); this._fallbackBattleTimer = null; }
                        this._fallbackBattleTimer = setInterval(() => {
                            try {
                                const cb = (G && G.state) ? G.state.currentBattle : null;
                                if (!cb) {
                                    if (this._fallbackBattleTimer) { clearInterval(this._fallbackBattleTimer); this._fallbackBattleTimer = null; }
                                    return;
                                }
                                const elapsed = Date.now() - (cb.startTime || Date.now());
                                if ((cb.timeLimit || 0) > 0 && elapsed >= (cb.timeLimit || 0)) {
                                    // clear timer
                                    if (this._fallbackBattleTimer) { clearInterval(this._fallbackBattleTimer); this._fallbackBattleTimer = null; }
                                    // Try to call legacy or engine handlers to process defeat
                                    try { if (typeof BossBattle !== 'undefined' && BossBattle && typeof BossBattle.endBattle === 'function') { BossBattle.endBattle(false, cb); return; } } catch(e) { /* ignore */ }
                                    try { const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME; if (runtime && typeof runtime.endBattle === 'function') { runtime.endBattle(false); return; } } catch(e) { /* ignore */ }
                                    try { if (typeof GAME !== 'undefined' && GAME && typeof GAME.loseBattle === 'function') { GAME.loseBattle(); return; } } catch(e) { /* ignore */ }
                                    // Fallback: mark ended and set lastBattleResult so UI shows defeat
                                    try {
                                        cb._ended = true; cb._endExpiresAt = Date.now() + 4000;
                                        if (G && G.state) {
                                            const coins = G.state.coins || 0;
                                            const penaltyPct = (cb.boss && cb.boss.isRandomSpawn) ? 0.40 : (typeof GAME !== 'undefined' && typeof GAME.PENALTY_PERCENT === 'number' ? GAME.PENALTY_PERCENT : 0.25);
                                            const penaltyAmt = Math.min(coins, Math.floor(coins * penaltyPct));
                                            G.state.coins = Math.max(0, coins - penaltyAmt);
                                            // If this fallback battle carried a random-server-steal risk, apply it now (only pick owned servers)
                                            let lostServerKey = null;
                                            try {
                                                if (cb && cb.risk && cb.risk.randomServerSteal) {
                                                    const ownedServers = Object.keys(G.state.servers || {}).filter(k => (G.state.servers[k] && (G.state.servers[k].count || 0) > 0));
                                                    if (ownedServers.length > 0) {
                                                        const randKey = ownedServers[Math.floor(Math.random() * ownedServers.length)];
                                                        const srv = G.state.servers[randKey];
                                                        if (srv) {
                                                            if (typeof srv.count === 'number' && srv.count > 1) {
                                                                G.state.servers[randKey].count = Math.max(0, srv.count - 1);
                                                                lostServerKey = randKey;
                                                            } else {
                                                                try { G.state.servers[randKey].count = 0; G.state.servers[randKey]._removed = true; lostServerKey = randKey; } catch(e2) { try { delete G.state.servers[randKey]; lostServerKey = randKey; } catch(e3) {} }
                                                            }
                                                            console.log('UI fallback defeat: applied randomServerSteal to', lostServerKey);
                                                        }
                                                    } else {
                                                        console.log('UI fallback defeat: no owned servers to steal from');
                                                    }
                                                }
                                            } catch(e) { console.warn('UI fallback defeat: randomServerSteal failed', e); }
                                            G.state.lastBattleResult = { outcome: 'defeat', bossId: cb.boss && cb.boss.id ? cb.boss.id : null, bossName: cb.boss && cb.boss.name ? cb.boss.name : 'UNKNOWN', penalty: penaltyAmt, lostServer: lostServerKey || null, time: Date.now() };
                                            try { if (typeof GAME !== 'undefined' && GAME.saveGame) GAME.saveGame(); } catch(e) {}
                                            try { if (typeof UI !== 'undefined' && UI.updateServersDisplay) UI.updateServersDisplay(); } catch(e) {}
                                            try { if (typeof UI !== 'undefined' && UI.updateDisplay) UI.updateDisplay(); } catch(e) {}
                                        }
                                    } catch(e) { /* ignore */ }
                                    try { if (typeof UI !== 'undefined' && UI.setupFightingTab) UI.setupFightingTab(); } catch(e) { /* ignore */ }
                                }
                            } catch(e) { /* ignore */ }
                        }, 1000);
                    } catch(e) { /* ignore */ }
                    this.setupFightingTab();
                    return;
                } else {
                        // If boss is higher tier than 'advanced_ai', show a risk confirmation overlay
                        const bosses = (G && G.CONFIG && Array.isArray(G.CONFIG.FIGHTING_BOSSES)) ? G.CONFIG.FIGHTING_BOSSES : [];
                        const advancedIdx = bosses.findIndex(b => b.id === 'advanced_ai');
                        const targetIdx = bosses.findIndex(b => b.id === bossId);
                        const isHighTier = (advancedIdx >= 0 && targetIdx > advancedIdx);

                        if (isHighTier) {
                            // choose a random owned server to risk
                            const ownedServers = Object.keys(G.state.servers || {}).filter(k => (G.state.servers[k] && G.state.servers[k].count > 0));
                            if (ownedServers.length === 0) {
                                UI.showNotification('No servers available', 'You have no servers to risk for this engagement');
                                return;
                            }

                            const serverKey = ownedServers[Math.floor(Math.random() * ownedServers.length)];
                            const serverName = (G.CONFIG.SERVERS && G.CONFIG.SERVERS[serverKey] && G.CONFIG.SERVERS[serverKey].name) ? G.CONFIG.SERVERS[serverKey].name : serverKey;
                            const currentCoins = (runtime && runtime.state) ? (runtime.state.coins || 0) : (G.state.coins || 0);
                            const tier = Math.max(1, (targetIdx - (advancedIdx || 0)));
                            const estimate = Math.floor(currentCoins * 0.02 * tier);

                            // Show overlay and bind confirmation
                            const riskOverlay = document.getElementById('bossRiskOverlay');
                            const riskServerName = document.getElementById('riskServerName');
                            const riskCoinEstimate = document.getElementById('riskCoinEstimate');
                            if (riskOverlay && riskServerName && riskCoinEstimate) {
                                riskServerName.textContent = serverName;
                                riskCoinEstimate.textContent = G.formatNumber(estimate);
                                riskOverlay.classList.remove('hidden');

                                // store pending values on UI object to use when confirmed
                                this._pendingBossRisk = { bossId, serverKey };
                            }
                            return;
                        } else {
                            engineStart(bossId);
                        }
                }
                this.setupFightingTab();
            });
        });

        // Recruitment UI retired; training now links Forge & Inventory (listeners attached here)

        // (gear shop removed) - equipment is now crafted in Forge and handled through inventory;
        // keeping fighting-gear/config available for backend logic but removing the shop UI.
    },

    /**
     * Get boss icon/markup based on boss object or risk level
     */
    getBossIcon(bossOrRisk) {
        // Accept either a boss object or a risk string for compatibility
        const appearance = (typeof bossOrRisk === 'object' && bossOrRisk.appearance) ? bossOrRisk.appearance : null;
        const risk = (typeof bossOrRisk === 'object' && bossOrRisk.risk) ? bossOrRisk.risk : (typeof bossOrRisk === 'string' ? bossOrRisk : 'low');

        if (appearance && appearance.startsWith('mech')) {
            // Render a small mechanical avatar using markup so CSS can target it
            const base = appearance.replace('mech-', '');
            return `<div class="mini-mech ${base}"><div class="eye"></div><div class="grill"></div></div>`;
        }

        const icons = {
            'low': '🤖',
            'medium': '🦾',
            'high': '⚡',
            'extreme': '🌟',
            'legendary': '👑'
        };
        return icons[risk] || '🤖';
    },

    /**
     * Get unit icon based on type
     */
    getUnitIcon(type) {
        const icons = {
            'melee': '⚔️',
            'ranged': '🏹',
            'magic': '🔮'
        };
        return icons[type] || '⚔️';
    },

    /**
     * Get gear icon based on type
     */
    getGearIcon(type) {
        const icons = {
            'armor': '🛡️',
            'swords': '⚔️',
            'bows': '🏹'
        };
        return icons[type] || '🛡️';
    },

    /**
     * Render daily challenges
     */
    renderDailyChallenges() {
        const container = document.getElementById('dailyChallengesGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        const challenges = GAME.state.dailyChallenges || [];
        
        if (challenges.length === 0) {
            container.innerHTML = '<div class="no-challenges">Loading challenges...</div>';
            return;
        }
        
        challenges.forEach(challenge => {
            const progress = challenge.progress || 0;
            const progressPercent = Math.min(100, (progress / challenge.target) * 100);
            
            const card = document.createElement('div');
            card.className = `daily-challenge-card${challenge.completed ? ' completed' : ''}`;
            card.innerHTML = `
                <div class="challenge-header">
                    <span class="challenge-icon">${challenge.icon}</span>
                    <span class="challenge-title">${challenge.title}</span>
                </div>
                <div class="challenge-description">${challenge.desc.replace('{target}', GAME.formatNumber(challenge.target))}</div>
                <div class="challenge-progress-container">
                    <div class="challenge-progress-bar">
                        <div class="challenge-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="challenge-progress-text">${GAME.formatNumber(progress)} / ${GAME.formatNumber(challenge.target)}</div>
                </div>
                <div class="challenge-reward">
                    <span class="challenge-reward-icon">🎁</span>
                    <span class="challenge-reward-text">${GAME.formatNumber(challenge.reward.coins)} coins + ${challenge.reward.skillPoints} SP</span>
                </div>
            `;
            container.appendChild(card);
        });
        
        // Update summary
        const completedCount = GAME.getDailyChallengesCompleted();
        const completedEl = document.getElementById('dailyCompletedCount');
        const streakEl = document.getElementById('dailyStreak');
        
        if (completedEl) completedEl.textContent = completedCount;
        if (streakEl) streakEl.textContent = GAME.state.dailyStreak || 0;
    },

    /**
     * Start daily timer countdown
     */
    startDailyTimer() {
        const updateTimer = () => {
            const timerEl = document.getElementById('dailyTimer');
            if (!timerEl) return;
            
            const timeLeft = GAME.getTimeUntilDailyReset();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            timerEl.textContent = `Refreshes in: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateTimer();
        
        // Clear any existing timer
        if (this.dailyTimerInterval) {
            clearInterval(this.dailyTimerInterval);
        }
        
        this.dailyTimerInterval = setInterval(updateTimer, 1000);
    },

    /**
     * Setup battery tab
     */
    setupBatteryTab() {
        try {
            const upgradesContainer = document.getElementById('batteryUpgrades');
            if (!upgradesContainer) return;
            
            upgradesContainer.innerHTML = '';
        
        // Define all three battery upgrades
        const upgradeKeys = ['battery_capacity', 'battery_charge_rate', 'battery_discharge_rate'];
        const methods = {
            'battery_capacity': { cost: () => GAME.getBatteryCapacityCost(), upgrade: () => GAME.upgradeBatteryCapacity(), level: () => GAME.state.batteryCapacityLevel },
            'battery_charge_rate': { cost: () => GAME.getBatteryChargeRateCost(), upgrade: () => GAME.upgradeBatteryChargeRate(), level: () => GAME.state.batteryChargeRateLevel },
            'battery_discharge_rate': { cost: () => GAME.getBatteryDischargeRateCost(), upgrade: () => GAME.upgradeBatteryDischargeRate(), level: () => GAME.state.batteryDischargeRateLevel }
        };
        
        // Create upgrade cards for each battery upgrade
        upgradeKeys.forEach(key => {
            const config = GAME.CONFIG.BATTERY_UPGRADES[key];
            const method = methods[key];
            const cost = method.cost();
            const level = method.level();
            const canAfford = GAME.state.coins >= cost;
            
            const card = document.createElement('div');
            card.className = 'upgrade-card battery-upgrade-card';
            
            let statInfo = '';
            if (key === 'battery_capacity') {
                const baseIncrease = config.capacityIncrease;
                const increaseAmount = baseIncrease + (level * 2);
                statInfo = `<span class="value">+${GAME.formatNumber(increaseAmount)} W</span>`;
            } else {
                statInfo = `<span class="value">+${config.rateIncrease} W/s</span>`;
            }
            
            const buyAmountText = this.buyAmount === 'max' ? 'MAX' : `x${this.buyAmount}`;
            card.innerHTML = `
                <div class="upgrade-header">
                    <h3>${config.name}</h3>
                    <p class="upgrade-description">${config.description}</p>
                </div>
                <div class="upgrade-stats">
                    <div class="stat-row">
                        <div class="stat">
                            <span class="label">Current Level:</span>
                            <span class="value">${level}</span>
                        </div>
                    </div>
                    <div class="stat-row">
                        <div class="stat">
                            <span class="label">Cost:</span>
                            <span class="value">${GAME.formatNumber(cost)}</span>
                        </div>
                    </div>
                    <div class="stat-row">
                        <div class="stat">
                            <span class="label">Increase:</span>
                            ${statInfo}
                        </div>
                    </div>
                </div>
                <button class="upgrade-button battery-upgrade-btn" data-key="${key}" ${!canAfford ? 'disabled' : ''}>${buyAmountText} - ${GAME.formatNumber(cost)}</button>
            `;
            
            const btn = card.querySelector('.battery-upgrade-btn');
            btn.addEventListener('click', () => {
                let purchaseCount = 0;
                const targetAmount = this.buyAmount === 'max' ? 1000 : this.buyAmount;
                
                for (let i = 0; i < targetAmount; i++) {
                    if (method.upgrade()) {
                        purchaseCount++;
                    } else {
                        break;
                    }
                }
                
                if (purchaseCount > 0) {
                    GAME.saveGame();
                    this.setupBatteryTab();
                    this.updateDisplay();
                }
            });
            
            upgradesContainer.appendChild(card);
        });
        
        this.updateBatteryDisplay();
        } catch (e) {
            console.error('UI.setupBatteryTab error', e);
            try { const upgradesContainer = document.getElementById('batteryUpgrades'); if (upgradesContainer) upgradesContainer.innerHTML = '<div class="error">Failed to load battery upgrades. See console.</div>'; } catch(e){}
        }
    },

    /**
     * Update battery display
     */
    updateBatteryDisplay() {
        const stored = document.getElementById('batteryStored');
        const capacity = document.getElementById('batteryCapacity');
        const chargeRate = document.getElementById('batteryChargeRate');
        
        if (stored) stored.textContent = GAME.formatNumber(GAME.state.batteryStored);
        if (capacity) capacity.textContent = GAME.formatNumber(GAME.state.batteryCapacity);
        
        // Calculate charge rate based on excess power
        const powerGen = GAME.getPowerGeneration();
        const powerUsage = GAME.getTotalPowerUsage();
        const excessPower = Math.max(0, powerGen - powerUsage);
        if (chargeRate) chargeRate.textContent = GAME.formatNumber(excessPower);
        
        // Update battery upgrade button states
        const methods = {
            'battery_capacity': () => GAME.getBatteryCapacityCost(),
            'battery_charge_rate': () => GAME.getBatteryChargeRateCost(),
            'battery_discharge_rate': () => GAME.getBatteryDischargeRateCost()
        };
        
        for (const [key, costFn] of Object.entries(methods)) {
            const btn = document.querySelector(`.battery-upgrade-btn[data-key="${key}"]`);
            if (btn) {
                const cost = costFn();
                const canAfford = GAME.state.coins >= cost;
                btn.disabled = !canAfford;
            }
        }
    },

    /**
     * Setup research tab
     */
    setupResearchTab() {
        try {
            const container = document.getElementById('researchGrid');
            container.innerHTML = '';

        // Group research by category
        const categories = {};
        for (const [key, config] of Object.entries(GAME.CONFIG.RESEARCH_UPGRADES)) {
            const category = config.category || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({ key, config });
        }
        
        // Define category order and display names
        const categoryOrder = ['core_systems', 'casino_games', 'power_generation', 'server_technology', 'mining', 'other'];
        const categoryNames = {
            'core_systems': '🔓 Core Systems',
            'casino_games': '🎰 Casino Games',
            'power_generation': '⚡ Power Generation',
            'server_technology': '🖥️ Server Technology',
            'mining': '⛏️ Mining',
            'other': '📦 Other'
        };

        // Display research grouped by category in order
        for (const category of categoryOrder) {
            const items = categories[category];
            if (!items || items.length === 0) continue;
            
            // Create category header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'research-category-header';
            categoryHeader.textContent = categoryNames[category] || category;
            container.appendChild(categoryHeader);

            // Create cards for each research in this category
            for (const { key, config } of items) {
                const isUnlocked = GAME.isResearchUnlocked(key);
                const canAfford = GAME.state.skillPoints >= config.skillPointCost;

                const card = document.createElement('div');
                card.className = 'research-card';
                if (isUnlocked) {
                    card.classList.add('unlocked');
                }

                card.innerHTML = `
                    <h3>${config.name}</h3>
                    <p class="research-desc">${config.description}</p>
                    <div class="research-cost">Cost: ${config.skillPointCost} Skill Points</div>
                    <button class="research-button" data-research="${key}" ${isUnlocked || !canAfford ? 'disabled' : ''}>
                        ${isUnlocked ? 'Unlocked' : 'Unlock'}
                    </button>
                `;
                
                card.querySelector(`[data-research="${key}"]`).addEventListener('click', () => {
                    if (GAME.unlockResearch(key)) {
                        // Save immediately after purchase
                        GAME.saveGame();
                        this.setupResearchTab();
                        this.setupPowerTab(); // Refresh power tab if generator was unlocked
                        this.updateLockedTabs(); // Update locked tabs immediately
                        this.updateCasinoGameTabs(); // Update casino game locks
                        this.updateDisplay();
                    }
                });
                
                container.appendChild(card);
            }
        }
        }
        catch (e) {
            console.error('UI.setupResearchTab error', e);
            try { const container = document.getElementById('researchGrid'); if (container) container.innerHTML = '<div class="error">Failed to load research. See console.</div>'; } catch(e){}
        }
    },

    // ==========================================
    // MINES TAB
    // ==========================================
    
    miningProgress: {},
    
    /**
     * Setup mines tab
     */
    setupMinesTab() {
        // Setup upgrade button click handlers
        const upgradeButtons = document.querySelectorAll('.mine-upgrade-btn');
        upgradeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mineId = btn.dataset.mine;
                this.upgradeMine(mineId);
            });
        });
        
        // Initialize progress tracking
        Object.keys(GAME.CONFIG.MINES).forEach(mineId => {
            this.miningProgress[mineId] = 0;
        });

        // Inject temporary CSS fixes for mines layout (keeps changes local and easy to tweak)
        try {
            if (!document.getElementById('mine-layout-fixes')) {
                const s = document.createElement('style');
                s.id = 'mine-layout-fixes';
                s.textContent = `
                .mines-section-wrapper { width: 100%; margin-bottom: 22px; }
                .mines-section-wrapper h2 { margin: 0 0 12px 8px; font-size: 1.05rem; color: var(--primary-color); }
                .mines-section { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; width: 100%; }
                .mines-section .mine-card { width: 100%; max-width: 260px; }
                @media (max-width: 1100px) { .mines-section { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
                @media (max-width: 640px) { .mines-section { grid-template-columns: 1fr; } .mines-section .mine-card { max-width: 100%; } }
                `;
                document.head.appendChild(s);
            }
        } catch (e) { console.warn('Failed to inject mine layout styles:', e); }

        // Group mine cards in the DOM into Manageable (upgradable) and Non-manageable sections
        try {
            const grid = document.getElementById('materialMinesGrid');
            if (grid) {
                // Create containers if they don't exist
                let manageableHeader = grid.querySelector('.mines-manageable-header');
                let nonManageableHeader = grid.querySelector('.mines-nonmanageable-header');
                let manageableContainer = grid.querySelector('#manageableMinesContainer');
                let nonManageableContainer = grid.querySelector('#nonManageableMinesContainer');

                if (!manageableContainer) {
                    manageableHeader = document.createElement('h2');
                    manageableHeader.className = 'mines-manageable-header';
                    manageableHeader.textContent = 'Manageable Mines';
                    manageableContainer = document.createElement('div');
                    manageableContainer.id = 'manageableMinesContainer';
                    manageableContainer.className = 'mines-section manageable';
                }
                if (!nonManageableContainer) {
                    nonManageableHeader = document.createElement('h2');
                    nonManageableHeader.className = 'mines-nonmanageable-header';
                    nonManageableHeader.textContent = 'Non-manageable Mines';
                    nonManageableContainer = document.createElement('div');
                    nonManageableContainer.id = 'nonManageableMinesContainer';
                    nonManageableContainer.className = 'mines-section non-manageable';
                }

                // Move existing mine-card elements into ordered Manageable and Non-manageable containers
                const allCards = Array.from(grid.querySelectorAll('.mine-card'));

                // Define explicit order lists (falls back to any remaining cards)
                const manageableOrder = ['lithium','galliumNitride','siliconCarbide','antimatium','darkium'];
                const nonManageableOrder = ['copper','iron','gold','platinium','lerasium','atium','harmonium'];

                const findCard = id => allCards.find(c => c.dataset && c.dataset.mine === id);

                // Prepare container layout as a 3-column grid
                manageableContainer.style.display = 'grid';
                manageableContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
                manageableContainer.style.gap = '12px';
                nonManageableContainer.style.display = 'grid';
                nonManageableContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
                nonManageableContainer.style.gap = '12px';

                // Clear grid and append titled sections so headers sit above their mines
                grid.innerHTML = '';
                const manageableSection = document.createElement('div');
                manageableSection.className = 'mines-section-wrapper manageable-wrapper';
                manageableSection.appendChild(manageableHeader);
                manageableSection.appendChild(manageableContainer);

                const nonManageableSection = document.createElement('div');
                nonManageableSection.className = 'mines-section-wrapper non-manageable-wrapper';
                nonManageableSection.appendChild(nonManageableHeader);
                nonManageableSection.appendChild(nonManageableContainer);

                grid.appendChild(manageableSection);
                grid.appendChild(nonManageableSection);

                // Add a Run Mines toggle button in the mines tab header area
                try {
                    let toggleWrap = document.getElementById('minesToggleWrap');
                    if (!toggleWrap) {
                        toggleWrap = document.createElement('div');
                        toggleWrap.id = 'minesToggleWrap';
                        toggleWrap.style.margin = '8px 0 12px 0';
                        grid.parentNode && grid.parentNode.insertBefore(toggleWrap, grid);
                    }
                    let btn = document.getElementById('toggleMinesBtn');
                    if (!btn) {
                        btn = document.createElement('button');
                        btn.id = 'toggleMinesBtn';
                        btn.className = 'toggle-mine-btn';
                        btn.innerHTML = '<span class="icon">⛏️</span><span class="label">Run Mines</span><span class="state"></span>';
                        toggleWrap.appendChild(btn);
                    }
                    const setBtnText = () => {
                        const enabled = (GAME.state && (typeof GAME.state.minesEnabled === 'undefined' || GAME.state.minesEnabled));
                        const stateEl = btn.querySelector('.state');
                        const labelEl = btn.querySelector('.label');
                        if (stateEl) stateEl.textContent = enabled ? 'ON' : 'OFF';
                        if (labelEl) labelEl.textContent = 'Run Mines';
                        btn.classList.toggle('on', enabled);
                        btn.classList.toggle('off', !enabled);
                        btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
                    };
                    btn.addEventListener('click', () => {
                        if (!GAME.state) GAME.state = {};
                        GAME.state.minesEnabled = !GAME.state.minesEnabled;
                        try { if (typeof GAME.saveGame === 'function') GAME.saveGame(); } catch(e){}
                        setBtnText();
                        this.updateMinesDisplay();
                    });
                    setBtnText();
                } catch(e) { console.warn('Failed to create mines toggle button', e); }

                const appended = new Set();

                // Append manageable mines in explicit order
                manageableOrder.forEach(mineId => {
                    const card = findCard(mineId);
                    if (card) {
                        manageableContainer.appendChild(card);
                        appended.add(mineId);
                    }
                });

                // Append any remaining manageable (upgradable) cards not in the explicit list
                allCards.forEach(card => {
                    const mineId = card.dataset.mine;
                    if (appended.has(mineId)) return;
                    const cfg = (GAME && GAME.CONFIG && GAME.CONFIG.MINES && GAME.CONFIG.MINES[mineId]) ? GAME.CONFIG.MINES[mineId] : null;
                    const isNonUpgradable = cfg && cfg.upgradable === false;
                    if (!isNonUpgradable) {
                        manageableContainer.appendChild(card);
                        appended.add(mineId);
                    }
                });

                // Append non-manageable mines in explicit order
                nonManageableOrder.forEach(mineId => {
                    const card = findCard(mineId);
                    if (card) {
                        nonManageableContainer.appendChild(card);
                        appended.add(mineId);
                    }
                });

                // Append any remaining non-manageable cards not in the explicit list
                allCards.forEach(card => {
                    const mineId = card.dataset.mine;
                    if (appended.has(mineId)) return;
                    const cfg = (GAME && GAME.CONFIG && GAME.CONFIG.MINES && GAME.CONFIG.MINES[mineId]) ? GAME.CONFIG.MINES[mineId] : null;
                    const isNonUpgradable = cfg && cfg.upgradable === false;
                    if (isNonUpgradable) {
                        nonManageableContainer.appendChild(card);
                        appended.add(mineId);
                    }
                });
            }
        } catch (e) { console.warn('Failed to categorize mine cards:', e); }
        
        // Initial display update
        this.updateMinesDisplay();
    },
    
    /**
     * Upgrade a mine
     */
    upgradeMine(mineId) {
        const mineConfig = GAME.CONFIG.MINES[mineId];
        if (!mineConfig) return;
        
        // Check if research is unlocked
        if (mineConfig.requiresResearch && !GAME.isResearchUnlocked(mineConfig.requiresResearch)) {
            this.showNotification('Research required to unlock this mine!', 'error');
            this.playSound('error');
            return;
        }
        
        // Initialize mine state if needed
        if (!GAME.state.mines) {
            GAME.state.mines = {};
        }
        if (!GAME.state.mines[mineId]) {
            GAME.state.mines[mineId] = { level: 0, mined: 0, stored: 0 };
        }
        
        const currentLevel = GAME.state.mines[mineId].level;
        const cost = Math.floor(mineConfig.baseCost * Math.pow(mineConfig.costMultiplier, currentLevel));
        
        if (GAME.state.coins < cost) {
            this.showNotification(`Not enough coins! Need ${GAME.formatNumber(cost)}`, 'error');
            this.playSound('error');
            return;
        }
        
        // Purchase upgrade
        GAME.state.coins -= cost;
        GAME.state.mines[mineId].level++;
        
        this.showNotification(`${mineConfig.name} Mine upgraded to level ${GAME.state.mines[mineId].level}!`, 'success');
        this.playSound('upgrade');
        
        this.updateMinesDisplay();
        this.updateDisplay();
        GAME.saveGame();
    },
    
    /**
     * Calculate mining rate for a mine
     */
    getMiningRate(mineId) {
        const mineConfig = GAME.CONFIG.MINES[mineId];
        if (!mineConfig) return 0;
        
        if (!GAME.state.mines || !GAME.state.mines[mineId]) return 0;
        
        const level = GAME.state.mines[mineId].level;
        if (level <= 0) return 0;
        
        return mineConfig.baseRate * Math.pow(mineConfig.rateMultiplier, level - 1);
    },
    
    /**
     * Process mining tick - called from game loop
     */
    processMiningTick(deltaTime) {
        if (!GAME.state.mines) return;
        // Respect global mines toggle
        if (GAME.state && GAME.state.minesEnabled === false) return;
        
        Object.keys(GAME.CONFIG.MINES).forEach(mineId => {
            const mineConfig = GAME.CONFIG.MINES[mineId];
            if (!mineConfig) return;
            
            // Check if research is unlocked
            if (mineConfig.requiresResearch && !GAME.isResearchUnlocked(mineConfig.requiresResearch)) {
                return;
            }
            
            if (!GAME.state.mines[mineId] || GAME.state.mines[mineId].level <= 0) return;
            
            const rate = this.getMiningRate(mineId);
            const mined = rate * (deltaTime / 1000);

            // POWER CHECK: compute required power for this tick (watts * seconds -> 'energy' units)
            const perSecondPower = Number(mineConfig.powerDraw) || 0;
            const requiredPower = perSecondPower * (deltaTime / 1000);

            let canProcess = true;
            if (perSecondPower > 0) {
                try {
                    const gen = (typeof GAME.getPowerGeneration === 'function') ? GAME.getPowerGeneration() : 0;
                    const usage = (typeof GAME.getTotalPowerUsage === 'function') ? GAME.getTotalPowerUsage() : 0;
                    const availGen = Math.max(0, gen - usage);
                    let batteryNeeded = Math.max(0, requiredPower - availGen);
                    if (batteryNeeded > 0) {
                        const provided = (typeof GAME.dischargeBattery === 'function') ? GAME.dischargeBattery(batteryNeeded) : 0;
                        if (provided < batteryNeeded) {
                            canProcess = false;
                        }
                    }
                } catch (e) { canProcess = false; }
            }

            if (!canProcess) {
                // skip mining this tick due to insufficient power
                return;
            }

            // Update progress bar (cycles every second)
            this.miningProgress[mineId] = (this.miningProgress[mineId] + (deltaTime / 1000) * rate) % 1;

            // Register transient power usage for UI / accounting while we credit mined resources
            try { GAME._transientPowerUsage = (GAME._transientPowerUsage || 0) + requiredPower; } catch(e) {}

            // Add to stored amount
            GAME.state.mines[mineId].stored += mined;
            // Do not cap stored/total for 'steel' mine; cap others to prevent overflow
            if (mineId !== 'steel' && GAME.state.mines[mineId].stored > 6400) GAME.state.mines[mineId].stored = 6400;
            GAME.state.mines[mineId].mined += mined;
            // Cap total mined tracked per-mine to 6400 for non-steel mines
            if (mineId !== 'steel' && GAME.state.mines[mineId].mined > 6400) GAME.state.mines[mineId].mined = 6400;
            // clear transient usage after updating state
            try { GAME._transientPowerUsage = Math.max(0, (GAME._transientPowerUsage || 0) - requiredPower); } catch(e) {}
        });
    },
    
    /**
     * Update mines display
     */
    updateMinesDisplay() {
        Object.keys(GAME.CONFIG.MINES).forEach(mineId => {
            const mineConfig = GAME.CONFIG.MINES[mineId];
            if (!mineConfig) return;
            
            // Check lock state
            const lockedEl = document.getElementById(`${mineId}Locked`);
            const isUnlocked = !mineConfig.requiresResearch || GAME.isResearchUnlocked(mineConfig.requiresResearch);
            
            if (lockedEl) {
                if (isUnlocked) {
                    lockedEl.classList.add('hidden');
                } else {
                    lockedEl.classList.remove('hidden');
                }
            }
            
            // Initialize state if needed
            if (!GAME.state.mines) GAME.state.mines = {};
            if (!GAME.state.mines[mineId]) {
                // For non-upgradable mines, start at level 1 so they immediately produce
                const startLevel = (mineConfig.upgradable === false) ? 1 : 0;
                GAME.state.mines[mineId] = { level: startLevel, mined: 0, stored: 0 };
            }
            
            const mineState = GAME.state.mines[mineId];

            // If this mine is unlocked and marked non-upgradable, ensure it starts at level 1
            if (isUnlocked && mineConfig.upgradable === false && mineState.level === 0) {
                mineState.level = 1;
                try { if (typeof GAME.saveGame === 'function') GAME.saveGame(); } catch (e) { /* ignore */ }
            }
            
            // Update level (hide entire Level stat for non-upgradable mines)
            const levelEl = document.getElementById(`${mineId}Level`);
            if (levelEl) {
                const levelStat = levelEl.closest('.mine-stat');
                if (mineConfig.upgradable === false) {
                    if (levelStat) levelStat.style.display = 'none';
                } else {
                    if (levelStat) levelStat.style.display = '';
                    levelEl.textContent = mineState.level;
                }
            }
            
            // Update rate
            const rateEl = document.getElementById(`${mineId}Rate`);
            if (rateEl) {
                const rate = this.getMiningRate(mineId);
                rateEl.textContent = rate.toFixed(2);
            }
            
            // Update mined
            const minedEl = document.getElementById(`${mineId}Mined`);
            if (minedEl) minedEl.textContent = Math.floor(mineState.mined);
            
            // Update stored count in inventory
            const countEl = document.getElementById(`${mineId}Count`);
            if (countEl) countEl.textContent = Math.floor(mineState.stored);
            
            // Update progress bar
            const progressEl = document.getElementById(`${mineId}Progress`);
            if (progressEl && mineState.level > 0) {
                const progress = (this.miningProgress[mineId] || 0) * 100;
                progressEl.style.width = progress + '%';
            }

            // Update power usage display (abbreviated watts) next to mine title
            try {
                const mineCard = document.querySelector(`.mine-card[data-mine="${mineId}"]`);
                if (mineCard) {
                    let pEl = mineCard.querySelector('.mine-power');
                    const pd = (mineConfig && Number(mineConfig.powerDraw)) ? Number(mineConfig.powerDraw) : 0;
                    const abbrev = (pd >= 1000) ? (pd/1000).toFixed(1) + 'kW' : pd + 'W';
                    if (!pEl) {
                        pEl = document.createElement('div');
                        pEl.className = 'mine-power';
                        mineCard.querySelector('.mine-header') && mineCard.querySelector('.mine-header').appendChild(pEl);
                    }
                    pEl.textContent = pd > 0 ? `⟂ ${abbrev}` : '';
                }
            } catch(e) { /* ignore */ }
            
            // Update cost
            const costEl = document.getElementById(`${mineId}Cost`);
            const upgradeBtn = document.getElementById(`${mineId}Upgrade`);
            if (costEl) {
                const nextCost = Math.floor(mineConfig.baseCost * Math.pow(mineConfig.costMultiplier, mineState.level));
                costEl.textContent = GAME.formatNumber(nextCost) + ' coins';
                
                // Hide or disable upgrade button for non-upgradable mines
                if (upgradeBtn) {
                    if (mineConfig.upgradable === false) {
                        upgradeBtn.style.display = 'none';
                        upgradeBtn.disabled = true;
                    } else {
                        upgradeBtn.style.display = '';
                        upgradeBtn.disabled = GAME.state.coins < nextCost || !isUnlocked;
                    }
                }
            }
            
            // Add mining class for animation
            const mineCard = document.querySelector(`.mine-card[data-mine="${mineId}"]`);
            if (mineCard) {
                if (mineState.level > 0 && isUnlocked) {
                    mineCard.classList.add('mining');
                } else {
                    mineCard.classList.remove('mining');
                }
            }
        });

        
    },
    
    /**
     * Check if player has enough materials for a server
     */
    hasEnoughMaterials(serverKey) {
        const serverConfig = GAME.CONFIG.SERVERS[serverKey];
        if (!serverConfig || !serverConfig.materialCost) return true;
        
        if (!GAME.state.mines) return false;
        
        for (const [material, amount] of Object.entries(serverConfig.materialCost)) {
            if (!GAME.state.mines[material] || GAME.state.mines[material].stored < amount) {
                return false;
            }
        }
        return true;
    },
    
    /**
     * Consume materials for server purchase
     */
    consumeMaterials(serverKey) {
        const serverConfig = GAME.CONFIG.SERVERS[serverKey];
        if (!serverConfig || !serverConfig.materialCost) return true;
        
        if (!this.hasEnoughMaterials(serverKey)) return false;
        
        for (const [material, amount] of Object.entries(serverConfig.materialCost)) {
            GAME.state.mines[material].stored -= amount;
        }
        return true;
    },
    
    /**
     * Get material requirements text for a server
     */
    getMaterialRequirementsText(serverKey) {
        const serverConfig = GAME.CONFIG.SERVERS[serverKey];
        if (!serverConfig || !serverConfig.materialCost) return '';
        
        const requirements = [];
        for (const [material, amount] of Object.entries(serverConfig.materialCost)) {
            const mineConfig = GAME.CONFIG.MINES[material];
            if (mineConfig) {
                const stored = GAME.state.mines?.[material]?.stored || 0;
                const hasEnough = stored >= amount;
                const color = hasEnough ? '#00ff88' : '#ff6666';
                requirements.push(`<span style="color: ${color}">${mineConfig.symbol}: ${Math.floor(stored)}/${amount}</span>`);
            }
        }
        return requirements.join(' | ');
    },

    // ==========================================
    // SKILL TREES
    // ==========================================

    currentSkillTree: 'clicking',

    /**
     * Setup skill trees tab with existing HTML structure
     */
    setupSkillTreesTab() {
        try {
            // Prevent multiple event listener setups
            if (this.skillTreesInitialized) return;
            this.skillTreesInitialized = true;
            
            // Setup tree selector tabs
            const treeTabs = document.querySelectorAll('.tree-tab-btn');
            if (treeTabs && treeTabs.length > 0) {
                treeTabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        const treeId = tab.dataset.tree;
                        this.selectSkillTreeTab(treeId);
                    });
                });
            } else {
                // Delegate in case nodes are rendered later
                const skilltreeContainer = document.getElementById('skilltree-tab');
                if (skilltreeContainer) {
                    skilltreeContainer.addEventListener('click', (ev) => {
                        const tab = ev.target.closest('.tree-tab-btn');
                        if (tab) this.selectSkillTreeTab(tab.dataset.tree);
                    });
                }
            }

            // Setup skill node click handlers
            const skillNodes = document.querySelectorAll('.skill-node');
            if (skillNodes && skillNodes.length > 0) {
                skillNodes.forEach(node => {
                    node.addEventListener('click', () => {
                        this.purchaseSkillNode(node);
                    });
                });
            } else {
                // Delegate to container for dynamic nodes
                const skilltreeContainer = document.getElementById('skilltree-tab');
                if (skilltreeContainer) {
                    skilltreeContainer.addEventListener('click', (ev) => {
                        const node = ev.target.closest('.skill-node');
                        if (node) this.purchaseSkillNode(node);
                    });
                }
            }

            // Recalculate skill effects from saved state
            this.recalculateSkillEffects();
            this.checkAndActivateSynergies();
            
            // Initial update
            this.updateSkillTreeDisplay();
        } catch (e) {
            console.error('UI.setupSkillTreesTab error', e);
        }
    },

    /**
     * Select and display a skill tree tab
     */
    selectSkillTreeTab(treeId) {
        this.currentSkillTree = treeId;
        
        // Update tab active state
        document.querySelectorAll('.tree-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tree === treeId);
        });
        
        // Update panel visibility
        document.querySelectorAll('.tree-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `tree-${treeId}`);
        });
    },

    /**
     * Purchase a skill node
     */
    purchaseSkillNode(node) {
        const skillId = node.dataset.skill;
        const treeId = node.dataset.tree;
        const requires = node.dataset.requires;
        
        console.log('Attempting to purchase skill:', treeId, skillId);
        
        // Check if already unlocked
        if (this.isSkillUnlocked(treeId, skillId)) {
            console.log('Skill already unlocked');
            this.showNotification('Skill already unlocked!', 'info');
            return;
        }
        
        // Check prerequisites
        if (requires) {
            const reqSkills = requires.split(',');
            console.log('Checking prerequisites:', reqSkills);
            for (const reqSkill of reqSkills) {
                if (!this.isSkillUnlocked(treeId, reqSkill)) {
                    console.log('Prerequisite not met:', reqSkill);
                    this.showNotification('Unlock prerequisite skills first!', 'error');
                    this.playSound('error');
                    return;
                }
            }
            console.log('Prerequisites met');
        }
        
        // Get cost from node
        const costText = node.querySelector('.node-cost');
        if (!costText) return;
        
        const cost = parseInt(costText.textContent.replace(' SP', ''));
        console.log('Skill cost:', cost, 'Current SP:', GAME.state.skillPoints);
        
        // Check if player has enough SP
        if (GAME.state.skillPoints < cost) {
            console.log('Not enough SP');
            this.showNotification(`Need ${cost} Skill Points!`, 'error');
            this.playSound('error');
            return;
        }
        
        // Purchase the skill
        GAME.state.skillPoints -= cost;
        console.log('Skill purchased successfully');
        
        // Mark skill as unlocked
        if (!GAME.state.skillTreeLevels) {
            GAME.state.skillTreeLevels = {};
        }
        GAME.state.skillTreeLevels[`${treeId}_${skillId}`] = 1;
        
        // Apply skill effect
        this.applySkillEffect(treeId, skillId);
        
        // Update UI
        this.updateSkillTreeDisplay();
        this.updateDisplay();
        this.playSound('upgrade');
        this.showNotification(`Skill unlocked: ${node.querySelector('.node-name').textContent}`, 'success');
        
        // If Spartan skill unlocked, refresh fighting tab and switch to it
        if (treeId === 'fighting' && skillId === 'spartan') {
            console.log('Setting fightingUnlocked flag');
            GAME.state.fightingUnlocked = true;
            this.setupFightingTab();
            this.switchTab('fighting');
        }
        
        // Check for synergies
        this.checkAndActivateSynergies();
        
        // Save game
        GAME.saveGame();
    },

    /**
     * Check if a skill is unlocked
     */
    isSkillUnlocked(treeId, skillId) {
        if (!GAME.state.skillTreeLevels) return false;
        return GAME.state.skillTreeLevels[`${treeId}_${skillId}`] > 0;
    },

    /**
     * Update all skill node displays
     */
    updateSkillTreeDisplay() {
        const skillNodes = document.querySelectorAll('.skill-node');
        skillNodes.forEach(node => {
            const skillId = node.dataset.skill;
            const treeId = node.dataset.tree;
            const requires = node.dataset.requires;
            
            const isUnlocked = this.isSkillUnlocked(treeId, skillId);
            
            // Check prerequisites
            let prereqsMet = true;
            if (requires && !isUnlocked) {
                const reqSkills = requires.split(',');
                for (const reqSkill of reqSkills) {
                    if (!this.isSkillUnlocked(treeId, reqSkill)) {
                        prereqsMet = false;
                        break;
                    }
                }
            }
            
            // Update node classes
            node.classList.remove('locked', 'unlocked', 'available');
            
            if (isUnlocked) {
                node.classList.add('unlocked');
            } else if (!prereqsMet) {
                node.classList.add('locked');
            } else {
                node.classList.add('available');
            }
        });
        
        // Update skill points display
        this.updateSkillPointsDisplay();
        
        // Update synergies display
        this.updateSynergiesDisplay();
    },

    /**
     * Apply a skill's effect
     */
    applySkillEffect(treeId, skillId) {
        const effects = GAME.state.activeSkillEffects || {};
        
        // Clicking Tree Effects
        if (treeId === 'clicking') {
            switch(skillId) {
                case 'click_power_1': effects.clickPowerBonus = (effects.clickPowerBonus || 0) + 0.25; break;
                case 'click_power_2': effects.clickPowerBonus = (effects.clickPowerBonus || 0) + 0.50; break;
                case 'click_power_3': effects.clickPowerBonus = (effects.clickPowerBonus || 0) + 1.00; break;
                case 'click_speed_1': effects.clickSpeedBonus = (effects.clickSpeedBonus || 0) + 0.10; break;
                case 'click_combo': effects.comboEnabled = true; break;
                case 'click_synergy_1': 
                    effects.clickPowerBonus = (effects.clickPowerBonus || 0) + 0.20;
                    effects.clickSpeedBonus = (effects.clickSpeedBonus || 0) + 0.20;
                    break;
                case 'auto_click': effects.autoClicksPerSecond = (effects.autoClicksPerSecond || 0) + 1; break;
                case 'click_ultimate': effects.clickTriggersPassive = true; break;
            }
        }
        
        // Production Tree Effects
        if (treeId === 'production') {
            switch(skillId) {
                case 'server_boost_1': effects.serverBonus = (effects.serverBonus || 0) + 0.20; break;
                case 'server_boost_2': effects.serverBonus = (effects.serverBonus || 0) + 0.40; break;
                case 'server_boost_3': effects.serverBonus = (effects.serverBonus || 0) + 0.75; break;
                case 'power_efficiency_1': effects.powerEfficiency = (effects.powerEfficiency || 0) + 0.15; break;
                case 'battery_boost': effects.batteryCapacityBonus = (effects.batteryCapacityBonus || 0) + 0.50; break;
                case 'prod_synergy_1': effects.serverPerGenerator = true; break;
                case 'solar_power': effects.powerGenerationBonus = (effects.powerGenerationBonus || 0) + 0.25; break;
                case 'prod_ultimate': effects.productionMultiplier = (effects.productionMultiplier || 1) * 2; break;
            }
        }
        
        // Casino Tree Effects
        if (treeId === 'casino') {
            switch(skillId) {
                case 'lucky_1': effects.casinoLuckBonus = (effects.casinoLuckBonus || 0) + 0.05; break;
                case 'lucky_2': effects.casinoLuckBonus = (effects.casinoLuckBonus || 0) + 0.10; break;
                case 'bigger_bets': effects.casinoPayoutBonus = (effects.casinoPayoutBonus || 0) + 0.10; break;
                case 'jackpot_boost': effects.jackpotBonus = (effects.jackpotBonus || 0) + 0.25; break;
                case 'casino_synergy_1': effects.luckToPayoutSynergy = true; break;
                case 'vip_boost': effects.vipXpBonus = (effects.vipXpBonus || 0) + 0.50; break;
                case 'cashback_boost': effects.casinoCashback = (effects.casinoCashback || 0) + 0.05; break;
                case 'casino_ultimate': 
                    effects.casinoLuckBonus = (effects.casinoLuckBonus || 0) + 0.15;
                    effects.casinoPayoutBonus = (effects.casinoPayoutBonus || 0) + 0.15;
                    effects.jackpotBonus = (effects.jackpotBonus || 0) + 0.15;
                    break;
            }
        }
        
        // Prestige Tree Effects
        if (treeId === 'prestige') {
            switch(skillId) {
                case 'prestige_boost_1': effects.prestigeBonus = (effects.prestigeBonus || 0) + 0.20; break;
                case 'prestige_boost_2': effects.prestigeBonus = (effects.prestigeBonus || 0) + 0.40; break;
                case 'prestige_boost_3': effects.prestigeBonus = (effects.prestigeBonus || 0) + 0.75; break;
                case 'startingcoins': effects.startingCoinsBonus = (effects.startingCoinsBonus || 0) + 2500; break;
                case 'sp_boost_1': effects.skillPointBonus = (effects.skillPointBonus || 0) + 0.15; break;
                case 'ascension_prep': effects.ascensionDiscount = (effects.ascensionDiscount || 0) + 0.10; break;
                case 'prestige_synergy_1': effects.keepCoinsOnPrestige = 0.01; break;
                case 'transcend_prep': effects.transcendenceDiscount = (effects.transcendenceDiscount || 0) + 0.10; break;
                case 'prestige_ultimate': 
                    effects.prestigeBonus = (effects.prestigeBonus || 0) + 0.25;
                    effects.skillPointBonus = (effects.skillPointBonus || 0) + 0.25;
                    break;
            }
        }
        
        GAME.state.activeSkillEffects = effects;
    },

    /**
     * Recalculate all skill effects from saved state
     */
    recalculateSkillEffects() {
        GAME.state.activeSkillEffects = {};
        
        if (!GAME.state.skillTreeLevels) return;
        
        for (const [key, level] of Object.entries(GAME.state.skillTreeLevels)) {
            if (level > 0) {
                const [treeId, skillId] = key.split('_').reduce((acc, part, i, arr) => {
                    if (acc.length === 0) {
                        // First part is always tree
                        return [part];
                    } else if (acc.length === 1) {
                        // Build skill id from remaining parts
                        return [acc[0], arr.slice(i).join('_')];
                    }
                    return acc;
                }, []);
                
                if (treeId && skillId) {
                    this.applySkillEffect(treeId, skillId);
                }
            }
        }
    },

    /**
     * Check and activate synergies
     */
    checkAndActivateSynergies() {
        const synergies = [];
        
        // Check clicking synergy
        if (this.isSkillUnlocked('clicking', 'click_synergy_1')) {
            synergies.push({
                name: 'Click Synergy',
                desc: '+20% to click power and speed',
                icon: '👆🔗'
            });
        }
        
        // Check production synergy
        if (this.isSkillUnlocked('production', 'prod_synergy_1')) {
            synergies.push({
                name: 'Efficient Servers',
                desc: 'Servers gain +1% per generator',
                icon: '⚡🔗'
            });
        }
        
        // Check casino synergy
        if (this.isSkillUnlocked('casino', 'casino_synergy_1')) {
            synergies.push({
                name: 'Risk Reward',
                desc: 'Bigger bets = bigger luck bonus',
                icon: '🎰🔗'
            });
        }
        
        // Check prestige synergy
        if (this.isSkillUnlocked('prestige', 'prestige_synergy_1')) {
            synergies.push({
                name: 'Reborn Stronger',
                desc: 'Keep 1% of coins on prestige',
                icon: '✨🔗'
            });
        }
        
        // Cross-tree synergies (ultimate skills)
        const clickUlt = this.isSkillUnlocked('clicking', 'click_ultimate');
        const prodUlt = this.isSkillUnlocked('production', 'prod_ultimate');
        const casinoUlt = this.isSkillUnlocked('casino', 'casino_ultimate');
        const prestigeUlt = this.isSkillUnlocked('prestige', 'prestige_ultimate');
        
        if (clickUlt && prodUlt) {
            synergies.push({
                name: 'Click Factory',
                desc: 'Clicks boost production by 5%',
                icon: '👆🏭'
            });
        }
        
        if (casinoUlt && prestigeUlt) {
            synergies.push({
                name: 'Jackpot Prestige',
                desc: 'Casino wins give bonus prestige points',
                icon: '🎰✨'
            });
        }
        
        // Ultimate mastery - all ultimates unlocked
        if (clickUlt && prodUlt && casinoUlt && prestigeUlt) {
            synergies.push({
                name: 'Grand Mastery',
                desc: 'All bonuses increased by 10%',
                icon: '🌟👑'
            });
        }
        
        GAME.state.activeSynergies = synergies;
    },

    /**
     * Update synergies display
     */
    updateSynergiesDisplay() {
        const synergyList = document.getElementById('synergyList');
        if (!synergyList) return;
        
        const synergies = GAME.state.activeSynergies || [];
        
        if (synergies.length === 0) {
            synergyList.innerHTML = '<span class="no-synergies">Unlock connected skills to activate synergies!</span>';
            return;
        }
        
        synergyList.innerHTML = synergies.map(s => `
            <div class="synergy-item active">
                <span class="synergy-icon">${s.icon}</span>
                <div class="synergy-info">
                    <span class="synergy-name">${s.name}</span>
                    <span class="synergy-desc">${s.desc}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Update skill points display
     */
    updateSkillPointsDisplay() {
        const spDisplay = document.getElementById('treeSkillPoints');
        if (spDisplay) {
            spDisplay.textContent = GAME.state.skillPoints;
        }
        
        const totalSpDisplay = document.getElementById('total-sp-earned');
        if (totalSpDisplay) {
            totalSpDisplay.textContent = `Total Earned: ${GAME.state.totalSkillPointsEarned} SP`;
        }
    },

    // ==========================================
    // LEADERBOARD
    // ==========================================

    leaderboardCategory: 'totalCoins',
    
    // Simulated player names for leaderboard
    aiPlayerNames: [
        'CryptoKing', 'ServerMaster', 'ClickLord', 'MiningPro', 'CoinHunter',
        'DataCenter99', 'HashKing', 'PowerPlayer', 'TechWizard', 'ByteBoss',
        'QuantumCoder', 'NeonRaider', 'CyberPunk42', 'PixelMiner', 'CodeNinja',
        'BitRunner', 'VoltageKing', 'GridMaster', 'RackLord', 'ServerSage',
        'CoinCollector', 'PrestigePro', 'GambleGod', 'LuckyStrike', 'JackpotJoe',
        'SlotMachine', 'DiceKing', 'WheelWinner', 'CardShark', 'ChipChamp',
        'xX_Hacker_Xx', 'ProGamer2024', 'ElitePlayer', 'MegaMiner', 'UltraClick'
    ],

    /**
     * Setup leaderboard tab
     */
    setupLeaderboardTab() {
        // Initialize player name from saved state
        const nameInput = document.getElementById('playerNameInput');
        if (nameInput) {
            nameInput.value = GAME.state.playerName || '';
        }

        // Save name button
        const saveBtn = document.getElementById('saveNameBtn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const name = nameInput.value.trim() || 'Anonymous';
                GAME.state.playerName = name;
                GAME.saveGame();
                this.showNotification('Name saved!', 'success');
                this.renderLeaderboard();
            };
        }

        // Category tabs
        document.querySelectorAll('.lb-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.leaderboardCategory = tab.dataset.category;
                this.renderLeaderboard();
            });
        });

        // Initial render
        this.renderLeaderboard();
        this.updatePersonalBests();
        this.startWeeklyTimer();
    },

    /**
     * Generate AI players for leaderboard
     */
    generateAIPlayers() {
        const players = [];
        const playerScore = this.getPlayerScore(this.leaderboardCategory);
        
        // Generate 20 AI players with varied scores
        for (let i = 0; i < 20; i++) {
            const name = this.aiPlayerNames[i % this.aiPlayerNames.length];
            
            // Generate scores based on category and player's score
            let score;
            const variance = Math.random();
            
            if (i < 3) {
                // Top 3 are always ahead of player
                score = Math.floor(playerScore * (1.5 + Math.random() * 2));
            } else if (i < 8) {
                // Next 5 are close to player
                score = Math.floor(playerScore * (0.8 + Math.random() * 0.6));
            } else {
                // Rest are below player
                score = Math.floor(playerScore * (0.1 + Math.random() * 0.5));
            }
            
            // Ensure minimum score
            score = Math.max(score, Math.floor(Math.random() * 1000) + 100);
            
            players.push({
                name: name,
                score: score,
                isAI: true,
                avatar: this.getRandomAvatar()
            });
        }
        
        return players;
    },

    /**
     * Get random avatar emoji
     */
    getRandomAvatar() {
        const avatars = ['🤖', '👾', '🎮', '💻', '🖥️', '⚡', '🔥', '💎', '🌟', '🎯', '🚀', '👽', '🦾', '🧠', '🎪'];
        return avatars[Math.floor(Math.random() * avatars.length)];
    },

    /**
     * Get player's score for current category
     */
    getPlayerScore(category) {
        switch (category) {
            case 'totalCoins':
                return Math.floor(GAME.state.totalCoinsEarned || 0);
            case 'prestigeLevel':
                return GAME.state.prestigeLevel || 0;
            case 'casinoWins':
                return Math.floor(GAME.state.casinoTotalWon || 0);
            case 'achievements':
                return GAME.state.unlockedAchievements ? GAME.state.unlockedAchievements.size : 0;
            default:
                return 0;
        }
    },

    /**
     * Format score for display
     */
    formatLeaderboardScore(score, category) {
        if (category === 'prestigeLevel' || category === 'achievements') {
            return score.toString();
        }
        return GAME.formatNumber(score);
    },

    /**
     * Render the leaderboard
     */
    renderLeaderboard() {
        const tbody = document.getElementById('leaderboardBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Get player data
        const playerName = GAME.state.playerName || 'You';
        const playerScore = this.getPlayerScore(this.leaderboardCategory);
        const playerData = {
            name: playerName,
            score: playerScore,
            isPlayer: true,
            avatar: '👤'
        };

        // Generate AI players
        const aiPlayers = this.generateAIPlayers();

        // Combine and sort
        const allPlayers = [...aiPlayers, playerData];
        allPlayers.sort((a, b) => b.score - a.score);

        // Find player rank
        const playerRank = allPlayers.findIndex(p => p.isPlayer) + 1;
        document.getElementById('playerRank').textContent = `#${playerRank}`;
        document.getElementById('playerScore').textContent = this.formatLeaderboardScore(playerScore, this.leaderboardCategory);

        // Render top 10
        allPlayers.slice(0, 10).forEach((player, index) => {
            const rank = index + 1;
            const row = document.createElement('tr');
            
            if (player.isPlayer) {
                row.classList.add('current-player');
            }
            if (rank === 1) row.classList.add('top-1');
            if (rank === 2) row.classList.add('top-2');
            if (rank === 3) row.classList.add('top-3');

            let rankBadgeClass = 'rank-normal';
            if (rank === 1) rankBadgeClass = 'rank-1';
            if (rank === 2) rankBadgeClass = 'rank-2';
            if (rank === 3) rankBadgeClass = 'rank-3';

            row.innerHTML = `
                <td class="rank-col">
                    <span class="rank-badge ${rankBadgeClass}">${rank}</span>
                </td>
                <td>
                    <div class="player-col">
                        <span class="lb-player-avatar">${player.avatar}</span>
                        <span class="lb-player-name">${player.isPlayer ? '⭐ ' + player.name : player.name}</span>
                    </div>
                </td>
                <td class="score-col">${this.formatLeaderboardScore(player.score, this.leaderboardCategory)}</td>
            `;

            tbody.appendChild(row);
        });

        // If player is not in top 10, show them at bottom
        if (playerRank > 10) {
            const dividerRow = document.createElement('tr');
            dividerRow.innerHTML = `<td colspan="3" style="text-align: center; color: var(--text-secondary);">...</td>`;
            tbody.appendChild(dividerRow);

            const playerRow = document.createElement('tr');
            playerRow.classList.add('current-player');
            playerRow.innerHTML = `
                <td class="rank-col">
                    <span class="rank-badge rank-normal">${playerRank}</span>
                </td>
                <td>
                    <div class="player-col">
                        <span class="lb-player-avatar">👤</span>
                        <span class="lb-player-name">⭐ ${playerName}</span>
                    </div>
                </td>
                <td class="score-col">${this.formatLeaderboardScore(playerScore, this.leaderboardCategory)}</td>
            `;
            tbody.appendChild(playerRow);
        }
    },

    /**
     * Update personal bests display
     */
    updatePersonalBests() {
        // Update highest coins
        const highestCoins = Math.max(GAME.state.coins, GAME.state.personalBestCoins || 0);
        GAME.state.personalBestCoins = highestCoins;
        const pbCoinsEl = document.getElementById('pbHighestCoins');
        if (pbCoinsEl) pbCoinsEl.textContent = GAME.formatNumber(highestCoins);

        // Update biggest casino win
        const biggestWin = GAME.state.casinoBiggestWin || 0;
        const pbWinEl = document.getElementById('pbBiggestWin');
        if (pbWinEl) pbWinEl.textContent = GAME.formatNumber(biggestWin);

        // Update best multiplier
        const bestMult = GAME.state.casinoBiggestMultiplier || 0;
        const pbMultEl = document.getElementById('pbBestMultiplier');
        if (pbMultEl) pbMultEl.textContent = bestMult.toFixed(2) + 'x';

        // Update longest streak
        const longestStreak = Math.max(GAME.state.dailyStreak || 0, GAME.state.longestDailyStreak || 0);
        GAME.state.longestDailyStreak = longestStreak;
        const pbStreakEl = document.getElementById('pbLongestStreak');
        if (pbStreakEl) pbStreakEl.textContent = longestStreak + ' days';
    },

    /**
     * Start weekly competition timer
     */
    startWeeklyTimer() {
        const updateTimer = () => {
            const timerEl = document.getElementById('weeklyTimer');
            if (!timerEl) return;

            // Calculate time until next Sunday midnight
            const now = new Date();
            const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
            const nextSunday = new Date(now);
            nextSunday.setDate(now.getDate() + daysUntilSunday);
            nextSunday.setHours(23, 59, 59, 999);

            const timeLeft = nextSunday - now;
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            if (days > 0) {
                timerEl.textContent = `${days}d ${hours}h ${minutes}m`;
            } else {
                timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    },

    /**
     * Setup Events & Mini-Games tab
     */
    setupEventsTab() {
        // Initialize mini-game cooldowns in state if not exists
        if (!GAME.state.minigameCooldowns) {
            GAME.state.minigameCooldowns = {};
        }
        if (!GAME.state.minigameHistory) {
            GAME.state.minigameHistory = [];
        }
        if (!GAME.state.minigameStats) {
            GAME.state.minigameStats = {
                clickFrenzyBest: 0,
                memoryMatchBest: Infinity,
                numberGuessBest: Infinity
            };
        }

        // Setup event banner
        this.setupEventBanner();

        // Setup mini-game buttons
        this.setupClickFrenzy();
        this.setupMemoryMatch();
        this.setupLuckySpin();
        this.setupNumberGuess();

        // Update cooldown displays
        this.updateMinigameCooldowns();

        // Setup close arena button
        const closeArena = document.getElementById('closeArena');
        const resultCloseBtn = document.getElementById('resultCloseBtn');
        
        if (closeArena) {
            closeArena.addEventListener('click', () => this.closeMinigameArena());
        }
        if (resultCloseBtn) {
            resultCloseBtn.addEventListener('click', () => this.closeMinigameArena());
        }

        // Update history display
        this.updateMinigameHistory();

        // Refresh cooldowns every second
        setInterval(() => this.updateMinigameCooldowns(), 1000);
    },

    /**
     * Setup Event Banner with rotating events
     */
    setupEventBanner() {
        const events = [
            {
                title: '🎲 Double Casino Weekend',
                desc: 'All casino winnings are doubled this weekend!',
                bonus: '2x Casino Rewards',
                type: 'casino'
            },
            {
                title: '⚡ Power Surge',
                desc: 'Power generators produce 50% more energy!',
                bonus: '+50% Power Output',
                type: 'power'
            },
            {
                title: '💰 Click Bonanza',
                desc: 'Every click is worth more coins!',
                bonus: '2x Click Value',
                type: 'click'
            },
            {
                title: '🖥️ Server Rush',
                desc: 'Servers generate bonus income!',
                bonus: '+25% Server Income',
                type: 'server'
            }
        ];

        // Pick a "current" event based on the day
        const today = new Date().getDay();
        const currentEvent = events[today % events.length];

        const titleEl = document.getElementById('activeEventTitle');
        const descEl = document.getElementById('activeEventDesc');
        const bonusEl = document.getElementById('eventBonus');

        if (titleEl) titleEl.textContent = currentEvent.title;
        if (descEl) descEl.textContent = currentEvent.desc;
        if (bonusEl) bonusEl.textContent = `✨ ${currentEvent.bonus}`;

        // Setup event timer (ends at midnight)
        const updateEventTimer = () => {
            const timerEl = document.getElementById('eventTimer');
            if (!timerEl) return;

            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(23, 59, 59, 999);

            const timeLeft = midnight - now;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        updateEventTimer();
        setInterval(updateEventTimer, 1000);
    },

    /**
     * Update mini-game cooldown displays
     */
    updateMinigameCooldowns() {
        const games = ['clickFrenzy', 'memoryMatch', 'luckySpin', 'numberGuess'];
        const cooldownTime = 5 * 60 * 1000; // 5 minutes for most games
        const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours for lucky spin

        games.forEach(game => {
            const cooldownEl = document.getElementById(`${game}Cooldown`);
            const btn = document.getElementById(`start${game.charAt(0).toUpperCase() + game.slice(1)}`);
            const lastPlayed = GAME.state.minigameCooldowns[game] || 0;
            const cooldown = game === 'luckySpin' ? dailyCooldown : cooldownTime;
            const timeLeft = (lastPlayed + cooldown) - Date.now();

            if (timeLeft > 0 && cooldownEl && btn) {
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                if (game === 'luckySpin') {
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    cooldownEl.textContent = `⏱️ ${hours}h ${minutes % 60}m`;
                } else {
                    cooldownEl.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
                btn.disabled = true;
            } else if (cooldownEl && btn) {
                cooldownEl.textContent = '';
                btn.disabled = false;
            }
        });
    },

    /**
     * Setup Click Frenzy mini-game
     */
    setupClickFrenzy() {
        const btn = document.getElementById('startClickFrenzy');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const cooldownTime = 5 * 60 * 1000;
            const lastPlayed = GAME.state.minigameCooldowns.clickFrenzy || 0;
            if (Date.now() - lastPlayed < cooldownTime) return;

            this.openMinigameArena('Click Frenzy', `
                <div class="click-frenzy-game">
                    <div class="frenzy-timer" id="frenzyTimer">10</div>
                    <div class="frenzy-clicks">Clicks: <span id="frenzyClicks">0</span></div>
                    <div class="frenzy-target disabled" id="frenzyTarget">⚡</div>
                    <button class="frenzy-start-btn" id="frenzyStartBtn">Start!</button>
                </div>
            `);

            let clicks = 0;
            let timeLeft = 10;
            let gameInterval = null;

            const target = document.getElementById('frenzyTarget');
            const timerEl = document.getElementById('frenzyTimer');
            const clicksEl = document.getElementById('frenzyClicks');
            const startBtn = document.getElementById('frenzyStartBtn');

            startBtn.addEventListener('click', () => {
                startBtn.style.display = 'none';
                target.classList.remove('disabled');
                clicks = 0;
                timeLeft = 10;

                gameInterval = setInterval(() => {
                    timeLeft--;
                    timerEl.textContent = timeLeft;
                    
                    if (timeLeft <= 0) {
                        clearInterval(gameInterval);
                        target.classList.add('disabled');
                        
                        // Calculate reward based on clicks
                        const reward = Math.floor(clicks * 100);
                        const isBest = clicks > (GAME.state.minigameStats.clickFrenzyBest || 0);
                        
                        if (isBest) {
                            GAME.state.minigameStats.clickFrenzyBest = clicks;
                        }

                        GAME.state.coins += reward;
                        GAME.state.minigameCooldowns.clickFrenzy = Date.now();
                        this.addMinigameHistory('Click Frenzy', '⚡', reward);
                        GAME.saveGame();
                        
                        this.showMinigameResult(
                            isBest ? '🏆 New Record!' : '🎉 Great Job!',
                            `You clicked ${clicks} times!${isBest ? ' (New Best!)' : ''}`,
                            reward
                        );
                    }
                }, 1000);

                target.addEventListener('click', () => {
                    if (!target.classList.contains('disabled')) {
                        clicks++;
                        clicksEl.textContent = clicks;
                        target.style.transform = 'scale(0.95)';
                        setTimeout(() => target.style.transform = 'scale(1)', 50);
                    }
                });
            });
        });
    },

    /**
     * Setup Memory Match mini-game
     */
    setupMemoryMatch() {
        const btn = document.getElementById('startMemoryMatch');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const cooldownTime = 5 * 60 * 1000;
            const lastPlayed = GAME.state.minigameCooldowns.memoryMatch || 0;
            if (Date.now() - lastPlayed < cooldownTime) return;

            const symbols = ['🎮', '🎲', '💎', '🎯', '🚀', '⭐', '🔥', '💰'];
            const cards = [...symbols, ...symbols].sort(() => Math.random() - 0.5);

            this.openMinigameArena('Memory Match', `
                <div class="memory-game">
                    <div class="memory-stats">
                        <div class="memory-stat">
                            <div class="label">Moves</div>
                            <div class="value" id="memoryMoves">0</div>
                        </div>
                        <div class="memory-stat">
                            <div class="label">Pairs</div>
                            <div class="value" id="memoryPairs">0/8</div>
                        </div>
                    </div>
                    <div class="memory-grid" id="memoryGrid">
                        ${cards.map((symbol, i) => `
                            <div class="memory-card" data-index="${i}" data-symbol="${symbol}">
                                <span class="back">❓</span>
                                <span class="front">${symbol}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);

            let moves = 0;
            let pairs = 0;
            let flipped = [];
            let canFlip = true;

            const grid = document.getElementById('memoryGrid');
            const movesEl = document.getElementById('memoryMoves');
            const pairsEl = document.getElementById('memoryPairs');

            grid.addEventListener('click', (e) => {
                const card = e.target.closest('.memory-card');
                if (!card || !canFlip || card.classList.contains('flipped') || card.classList.contains('matched')) return;

                card.classList.add('flipped');
                flipped.push(card);

                if (flipped.length === 2) {
                    moves++;
                    movesEl.textContent = moves;
                    canFlip = false;

                    const [card1, card2] = flipped;
                    if (card1.dataset.symbol === card2.dataset.symbol) {
                        card1.classList.add('matched');
                        card2.classList.add('matched');
                        pairs++;
                        pairsEl.textContent = `${pairs}/8`;
                        flipped = [];
                        canFlip = true;

                        if (pairs === 8) {
                            // Game won!
                            const baseReward = 15000;
                            const bonusReward = Math.max(0, (30 - moves) * 500);
                            const reward = baseReward + bonusReward;
                            const isBest = moves < (GAME.state.minigameStats.memoryMatchBest || Infinity);

                            if (isBest) {
                                GAME.state.minigameStats.memoryMatchBest = moves;
                            }

                            GAME.state.coins += reward;
                            GAME.state.minigameCooldowns.memoryMatch = Date.now();
                            this.addMinigameHistory('Memory Match', '🧠', reward);
                            GAME.saveGame();

                            setTimeout(() => {
                                this.showMinigameResult(
                                    isBest ? '🏆 New Record!' : '🎉 Completed!',
                                    `Finished in ${moves} moves!${isBest ? ' (New Best!)' : ''}`,
                                    reward
                                );
                            }, 500);
                        }
                    } else {
                        setTimeout(() => {
                            card1.classList.remove('flipped');
                            card2.classList.remove('flipped');
                            flipped = [];
                            canFlip = true;
                        }, 1000);
                    }
                }
            });
        });
    },

    /**
     * Setup Lucky Spin mini-game
     */
    setupLuckySpin() {
        const btn = document.getElementById('startLuckySpin');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const dailyCooldown = 24 * 60 * 60 * 1000;
            const lastPlayed = GAME.state.minigameCooldowns.luckySpin || 0;
            if (Date.now() - lastPlayed < dailyCooldown) return;

            const prizes = [
                { label: '5,000 Coins', value: 5000, color: '#ff6b35' },
                { label: '10,000 Coins', value: 10000, color: '#ffc107' },
                { label: '25,000 Coins', value: 25000, color: '#4caf50' },
                { label: '50,000 Coins', value: 50000, color: '#2196f3' },
                { label: '100,000 Coins', value: 100000, color: '#9c27b0' },
                { label: '2x Next Win', value: 'multiplier', color: '#e91e63' },
                { label: '500,000 Coins', value: 500000, color: '#00bcd4' },
                { label: '1 Prestige Point', value: 'prestige', color: '#ff5722' }
            ];

            this.openMinigameArena('Daily Spin', `
                <div class="lucky-spin-game">
                    <div class="spin-prizes">
                        ${prizes.map(p => `<span class="spin-prize-tag">${p.label}</span>`).join('')}
                    </div>
                    <div class="spin-wheel-container">
                        <div class="wheel-pointer"></div>
                        <div class="spin-wheel" id="spinWheel"></div>
                    </div>
                    <button class="spin-btn" id="spinBtn">🎡 SPIN!</button>
                    <div class="spin-result" id="spinResult"></div>
                </div>
            `);

            // Need a small delay to ensure DOM is updated
            setTimeout(() => {
                const wheel = document.getElementById('spinWheel');
                const spinBtn = document.getElementById('spinBtn');
                const resultEl = document.getElementById('spinResult');

                if (!spinBtn || !wheel || !resultEl) {
                    console.error('Lucky Spin elements not found');
                    return;
                }

                spinBtn.addEventListener('click', () => {
                spinBtn.disabled = true;
                
                // Random prize selection
                const prizeIndex = Math.floor(Math.random() * prizes.length);
                const prize = prizes[prizeIndex];
                
                // Calculate rotation (5 full spins + landing position)
                const segmentAngle = 360 / prizes.length;
                const targetAngle = (5 * 360) + (prizeIndex * segmentAngle) + (segmentAngle / 2);
                
                wheel.style.transform = `rotate(${targetAngle}deg)`;

                setTimeout(() => {
                    // Award prize
                    let rewardText = '';
                    if (prize.value === 'multiplier') {
                        GAME.state.nextWinMultiplier = 2;
                        rewardText = '2x Next Casino Win!';
                    } else if (prize.value === 'prestige') {
                        GAME.state.prestigePoints = (GAME.state.prestigePoints || 0) + 1;
                        rewardText = '+1 Prestige Point!';
                    } else {
                        GAME.state.coins += prize.value;
                        rewardText = `+${GAME.formatNumber(prize.value)} Coins!`;
                    }

                    GAME.state.minigameCooldowns.luckySpin = Date.now();
                    this.addMinigameHistory('Daily Spin', '🎡', prize.value === 'multiplier' ? '2x' : (prize.value === 'prestige' ? '1 PP' : prize.value));
                    GAME.saveGame();

                    resultEl.textContent = `🎉 ${rewardText}`;
                    
                    setTimeout(() => {
                        this.showMinigameResult(
                            '🎡 Lucky Spin!',
                            `You won: ${prize.label}!`,
                            typeof prize.value === 'number' ? prize.value : 0
                        );
                    }, 1000);
                }, 4000);
            });
            }, 0);
        });
    },

    /**
     * Setup Number Guess mini-game
     */
    setupNumberGuess() {
        const btn = document.getElementById('startNumberGuess');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const cooldownTime = 5 * 60 * 1000;
            const lastPlayed = GAME.state.minigameCooldowns.numberGuess || 0;
            if (Date.now() - lastPlayed < cooldownTime) return;

            const secretNumber = Math.floor(Math.random() * 100) + 1;
            let attempts = 7;
            let guesses = [];

            this.openMinigameArena('Number Guess', `
                <div class="number-guess-game">
                    <div class="guess-info">
                        <div class="guess-range">Guess a number between 1 and 100</div>
                        <div class="guess-attempts">Attempts left: <span id="attemptsLeft">${attempts}</span></div>
                    </div>
                    <div class="guess-input-area">
                        <input type="number" class="guess-input" id="guessInput" min="1" max="100" placeholder="?">
                        <button class="guess-btn" id="guessBtn">Guess!</button>
                    </div>
                    <div class="guess-feedback" id="guessFeedback"></div>
                    <div class="guess-history" id="guessHistory"></div>
                </div>
            `);

            // Need a small delay to ensure DOM is updated
            setTimeout(() => {
                const input = document.getElementById('guessInput');
                const guessBtn = document.getElementById('guessBtn');
                const feedbackEl = document.getElementById('guessFeedback');
                const attemptsEl = document.getElementById('attemptsLeft');
                const historyEl = document.getElementById('guessHistory');

                if (!input || !guessBtn || !feedbackEl || !attemptsEl || !historyEl) {
                    console.error('Number Guess elements not found');
                    return;
                }

                const makeGuess = () => {
                const guess = parseInt(input.value);
                if (isNaN(guess) || guess < 1 || guess > 100) {
                    feedbackEl.textContent = 'Enter a number between 1 and 100!';
                    feedbackEl.className = 'guess-feedback';
                    return;
                }

                attempts--;
                attemptsEl.textContent = attempts;
                guesses.push(guess);

                // Add to history
                const tag = document.createElement('span');
                tag.className = `guess-tag ${guess < secretNumber ? 'too-low' : (guess > secretNumber ? 'too-high' : '')}`;
                tag.textContent = guess;
                historyEl.appendChild(tag);

                input.value = '';

                if (guess === secretNumber) {
                    // Won!
                    const baseReward = 20000;
                    const bonusReward = attempts * 3000;
                    const reward = baseReward + bonusReward;
                    const isBest = (7 - attempts) < (GAME.state.minigameStats.numberGuessBest || Infinity);

                    if (isBest) {
                        GAME.state.minigameStats.numberGuessBest = 7 - attempts;
                    }

                    GAME.state.coins += reward;
                    GAME.state.minigameCooldowns.numberGuess = Date.now();
                    this.addMinigameHistory('Number Guess', '🔢', reward);
                    GAME.saveGame();

                    feedbackEl.textContent = '🎉 Correct!';
                    feedbackEl.className = 'guess-feedback correct';
                    guessBtn.disabled = true;

                    setTimeout(() => {
                        this.showMinigameResult(
                            isBest ? '🏆 New Record!' : '🎉 You Got It!',
                            `Guessed in ${7 - attempts} tries!${isBest ? ' (New Best!)' : ''}`,
                            reward
                        );
                    }, 1000);
                } else if (attempts === 0) {
                    // Lost
                    GAME.state.minigameCooldowns.numberGuess = Date.now();
                    GAME.saveGame();

                    feedbackEl.textContent = `😢 Game Over! The number was ${secretNumber}`;
                    feedbackEl.className = 'guess-feedback';
                    guessBtn.disabled = true;

                    setTimeout(() => {
                        this.showMinigameResult(
                            '😢 Out of Tries!',
                            `The number was ${secretNumber}. Better luck next time!`,
                            0
                        );
                    }, 1500);
                } else if (guess < secretNumber) {
                    feedbackEl.textContent = '📈 Higher!';
                    feedbackEl.className = 'guess-feedback higher';
                } else {
                    feedbackEl.textContent = '📉 Lower!';
                    feedbackEl.className = 'guess-feedback lower';
                }
            };

            guessBtn.addEventListener('click', makeGuess);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') makeGuess();
            });
            }, 0);
        });
    },

    /**
     * Open mini-game arena
     */
    openMinigameArena(title, content) {
        const arena = document.getElementById('minigameArena');
        const titleEl = document.getElementById('arenaTitle');
        const contentEl = document.getElementById('arenaContent');
        const resultEl = document.getElementById('arenaResult');

        if (arena && titleEl && contentEl && resultEl) {
            titleEl.textContent = title;
            contentEl.innerHTML = content;
            resultEl.classList.add('hidden');
            arena.classList.remove('hidden');
            
            // Scroll to the arena smoothly
            setTimeout(() => {
                arena.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    },

    /**
     * Show mini-game result
     */
    showMinigameResult(title, text, reward) {
        const contentEl = document.getElementById('arenaContent');
        const resultEl = document.getElementById('arenaResult');
        const iconEl = document.getElementById('resultIcon');
        const textEl = document.getElementById('resultText');
        const rewardEl = document.getElementById('resultReward');

        if (contentEl && resultEl) {
            contentEl.style.display = 'none';
            resultEl.classList.remove('hidden');
            
            if (iconEl) iconEl.textContent = reward > 0 ? '🎉' : '😢';
            if (textEl) textEl.innerHTML = `<strong>${title}</strong><br>${text}`;
            if (rewardEl) rewardEl.textContent = reward > 0 ? `+${GAME.formatNumber(reward)} coins` : 'No reward';
        }

        this.updateDisplay();
    },

    /**
     * Close mini-game arena
     */
    closeMinigameArena() {
        const arena = document.getElementById('minigameArena');
        const contentEl = document.getElementById('arenaContent');
        
        if (arena) {
            arena.classList.add('hidden');
        }
        if (contentEl) {
            contentEl.style.display = 'block';
        }

        this.updateMinigameCooldowns();
        this.updateMinigameHistory();
    },

    /**
     * Add to mini-game history
     */
    addMinigameHistory(game, icon, reward) {
        if (!GAME.state.minigameHistory) {
            GAME.state.minigameHistory = [];
        }

        GAME.state.minigameHistory.unshift({
            game,
            icon,
            reward,
            time: Date.now()
        });

        // Keep only last 10 entries
        if (GAME.state.minigameHistory.length > 10) {
            GAME.state.minigameHistory.pop();
        }
    },

    /**
     * Update mini-game history display
     */
    updateMinigameHistory() {
        const historyEl = document.getElementById('eventHistory');
        if (!historyEl) return;

        const history = GAME.state.minigameHistory || [];

        if (history.length === 0) {
            historyEl.innerHTML = '<div class="no-history">Play mini-games to see your rewards here!</div>';
            return;
        }

        historyEl.innerHTML = history.map(entry => {
            const timeAgo = this.getTimeAgo(entry.time);
            const rewardText = typeof entry.reward === 'number' 
                ? `+${GAME.formatNumber(entry.reward)}` 
                : entry.reward;

            return `
                <div class="history-item">
                    <div class="history-game">
                        <span class="icon">${entry.icon}</span>
                        <span class="name">${entry.game}</span>
                    </div>
                    <span class="history-reward">${rewardText}</span>
                    <span class="history-time">${timeAgo}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Get human-readable time ago string
     */
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    },

    /**
     * Setup Stats & Analytics tab
     */
    setupStatsTab() {
        // Update stats every second
        setInterval(() => this.updateStatsDisplay(), 1000);
        this.updateStatsDisplay();
    },

    /**
     * Update stats display
     */
    updateStatsDisplay() {
        const state = GAME.state;
        const stats = state.stats || {};

        // Currency stats
        this.setStatValue('statCurrentCoins', GAME.formatNumber(state.coins));
        this.setStatValue('statTotalCoins', GAME.formatNumber(state.totalCoinsEarned));
        this.setStatValue('statPeakCoins', GAME.formatNumber(stats.peakCoins || 0));
        this.setStatValue('statCPS', GAME.formatNumber(GAME.getTotalProduction()) + '/s');
        this.setStatValue('statPeakCPS', GAME.formatNumber(stats.peakCoinsPerSecond || 0) + '/s');

        // Click stats
        this.setStatValue('statTotalClicks', GAME.formatNumber(stats.totalClicks || 0));
        this.setStatValue('statClickPower', GAME.formatNumber(state.clickPower));
        const clickUpgradeCount = Object.values(state.clickUpgrades || {}).reduce((sum, u) => sum + (u.level || 0), 0);
        this.setStatValue('statClickUpgrades', clickUpgradeCount);

        // Prestige stats
        this.setStatValue('statPrestigeLevel', state.prestigeLevel || 0);
        this.setStatValue('statPrestigePoints', GAME.formatNumber(state.prestigePoints || 0));
        this.setStatValue('statAscensionLevel', state.ascensionLevel || 0);
        this.setStatValue('statTranscendenceLevel', state.transcendenceLevel || 0);
        this.setStatValue('statTotalResets', stats.totalResets || 0);

        // Infrastructure stats
        const totalServers = Object.values(state.servers || {}).reduce((sum, s) => sum + (s.count || 0), 0);
        this.setStatValue('statTotalServers', totalServers);
        this.setStatValue('statTotalGenerators', (state.powerGenerators || []).length);
        this.setStatValue('statTotalBuildings', Object.keys(state.buildings || {}).length);
        this.setStatValue('statResearchCompleted', (state.unlockedResearch?.size || 0));

        // Casino stats
        this.setStatValue('statCasinoGames', state.casinoGamesPlayed || 0);
        this.setStatValue('statCasinoWagered', GAME.formatNumber(state.casinoTotalWagered || 0));
        this.setStatValue('statCasinoWon', GAME.formatNumber(state.casinoTotalWon || 0));
        const profit = (state.casinoTotalWon || 0) - (state.casinoTotalWagered || 0);
        this.setStatValue('statCasinoProfit', (profit >= 0 ? '+' : '') + GAME.formatNumber(profit));
        this.setStatValue('statBiggestWin', GAME.formatNumber(state.casinoBiggestWin || 0));

        // Time stats
        const sessionTime = Date.now() - (stats.sessionStartTime || Date.now());
        this.setStatValue('statCurrentSession', this.formatTime(sessionTime));
        this.setStatValue('statTotalPlayTime', this.formatTime(stats.totalPlayTime || 0));
        this.setStatValue('statLongestSession', this.formatTime(stats.longestSession || 0));
        this.setStatValue('statTotalSessions', stats.totalSessions || 1);

        // Achievement stats
        this.setStatValue('statAchievements', `${state.unlockedAchievements?.size || 0}/${GAME.CONFIG.ACHIEVEMENTS.length}`);
        this.setStatValue('statDailyChallenges', state.dailyChallengesCompleted || 0);
        this.setStatValue('statDailyStreak', state.dailyStreak || 0);
        this.setStatValue('statUnlockables', `${state.unlockedContent?.size || 0}/${Object.keys(GAME.CONFIG.UNLOCKABLES).length}`);

        // Mini-game stats
        const mgStats = state.minigameStats || {};
        this.setStatValue('statClickFrenzyBest', (mgStats.clickFrenzyBest || 0) + ' clicks');
        this.setStatValue('statMemoryBest', mgStats.memoryMatchBest === Infinity ? '--' : mgStats.memoryMatchBest + ' moves');
        this.setStatValue('statGuessBest', mgStats.numberGuessBest === Infinity ? '--' : mgStats.numberGuessBest + ' tries');
    },

    /**
     * Helper to set stat value
     */
    setStatValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    /**
     * Format milliseconds to time string
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Setup prestige tab
     */
    setupPrestigeTab() {
        // Update all level displays
        const prestigeLevelDisplay = document.getElementById('prestigeLevelDisplay');
        const ascensionLevelDisplay = document.getElementById('ascensionLevelDisplay');
        const transcendenceLevelDisplay = document.getElementById('transcendenceLevelDisplay');
        
        if (prestigeLevelDisplay) prestigeLevelDisplay.textContent = GAME.state.prestigeLevel || 0;
        if (ascensionLevelDisplay) ascensionLevelDisplay.textContent = GAME.state.ascensionLevel || 0;
        if (transcendenceLevelDisplay) transcendenceLevelDisplay.textContent = GAME.state.transcendenceLevel || 0;

        // Update network capacity display
        try {
            const netEl = document.getElementById('networkCapacityDisplay');
            if (netEl) {
                const base = (GAME.state && Number.isFinite(Number(GAME.state.networkCapacity))) ? Number(GAME.state.networkCapacity) : 100;
                const prestigeLevels = GAME.state.prestigeUpgrades?.network_capacity?.level || 0;
                const cap = base + (prestigeLevels * 10000);
                netEl.textContent = `${cap} W`;
            }
        } catch(e) { /* ignore */ }

        // Setup layer tab switching
        this.setupPrestigeLayerTabs();

        // Setup Prestige Upgrades
        this.renderPrestigeUpgrades();

        // Setup Ascension Upgrades
        this.renderAscensionUpgrades();

        // Setup Transcendence Upgrades
        this.renderTranscendenceUpgrades();

        // Setup Unlocks
        this.renderUnlocks();

        // Setup prestige button
        const prestigeButton = document.getElementById('prestigeButton');
        if (prestigeButton) {
            const pointsGained = GAME.calculatePrestigeGain();
            prestigeButton.textContent = `Reset for ${pointsGained} Prestige Points`;
            prestigeButton.disabled = pointsGained === 0;
            
            // Remove old listeners
            const newBtn = prestigeButton.cloneNode(true);
            prestigeButton.parentNode.replaceChild(newBtn, prestigeButton);
            
            newBtn.addEventListener('click', () => {
                const pts = GAME.calculatePrestigeGain();
                if (pts > 0 && confirm(`⚠️ PRESTIGE RESET\n\nGain ${pts} Prestige Points?\n\nAll coins, buildings, servers, and upgrades will be reset.`)) {
                    GAME.prestige();
                    GAME.saveGame();
                    this.updateDisplay();
                    this.setupPrestigeTab();
                    // Update building selector and rack after prestige reset
                    this.updateBuildingSelector();
                    this.updateRackInfo();
                    this.renderRack();
                }
            });
        }

        // Setup ascend button
        const ascendButton = document.getElementById('ascendButton');
        if (ascendButton) {
            const canAscend = GAME.canAscend();
            const pointsGained = GAME.calculateAscensionGain();
            
            ascendButton.disabled = !canAscend;
            ascendButton.textContent = canAscend 
                ? `Ascend for ${pointsGained} Ascension Points`
                : `Requires Prestige Level 10 (Current: ${GAME.state.prestigeLevel})`;
            
            const newBtn = ascendButton.cloneNode(true);
            ascendButton.parentNode.replaceChild(newBtn, ascendButton);
            
            newBtn.addEventListener('click', () => {
                if (GAME.canAscend() && confirm(`🌟 ASCENSION\n\nThis will reset ALL prestige progress!\n\nGain ${GAME.calculateAscensionGain()} Ascension Points?`)) {
                    GAME.ascend();
                    GAME.saveGame();
                    this.updateDisplay();
                    this.setupPrestigeTab();
                    // Update building selector and rack after ascension reset
                    this.updateBuildingSelector();
                    this.updateRackInfo();
                    this.renderRack();
                }
            });
        }

        // Setup transcend button
        const transcendButton = document.getElementById('transcendButton');
        if (transcendButton) {
            const canTranscend = GAME.canTranscend();
            const pointsGained = GAME.calculateTranscendenceGain();
            
            transcendButton.disabled = !canTranscend;
            transcendButton.textContent = canTranscend 
                ? `Transcend for ${pointsGained} Transcendence Points`
                : `Requires Ascension Level 5 (Current: ${GAME.state.ascensionLevel})`;
            
            const newBtn = transcendButton.cloneNode(true);
            transcendButton.parentNode.replaceChild(newBtn, transcendButton);
            
            newBtn.addEventListener('click', () => {
                if (GAME.canTranscend() && confirm(`✨ TRANSCENDENCE\n\nThis will reset ALL ascension and prestige progress!\n\nGain ${GAME.calculateTranscendenceGain()} Transcendence Points?`)) {
                    GAME.transcend();
                    GAME.saveGame();
                    this.updateDisplay();
                    this.setupPrestigeTab();
                    // Update building selector and rack after transcendence reset
                    this.updateBuildingSelector();
                    this.updateRackInfo();
                    this.renderRack();
                }
            });
        }

        // Update stat displays
        const totalPrestigePoints = document.getElementById('totalPrestigePoints');
        if (totalPrestigePoints) totalPrestigePoints.textContent = GAME.state.prestigePoints || 0;

        const ascensionPrestigeLevel = document.getElementById('ascensionPrestigeLevel');
        if (ascensionPrestigeLevel) ascensionPrestigeLevel.textContent = GAME.state.prestigeLevel || 0;

        const ascensionPointsGained = document.getElementById('ascensionPointsGained');
        if (ascensionPointsGained) ascensionPointsGained.textContent = GAME.calculateAscensionGain();

        const totalAscensionPoints = document.getElementById('totalAscensionPoints');
        if (totalAscensionPoints) totalAscensionPoints.textContent = GAME.state.ascensionPoints || 0;

        const transcendenceAscensionLevel = document.getElementById('transcendenceAscensionLevel');
        if (transcendenceAscensionLevel) transcendenceAscensionLevel.textContent = GAME.state.ascensionLevel || 0;

        const transcendencePointsGained = document.getElementById('transcendencePointsGained');
        if (transcendencePointsGained) transcendencePointsGained.textContent = GAME.calculateTranscendenceGain();

        const totalTranscendencePoints = document.getElementById('totalTranscendencePoints');
        if (totalTranscendencePoints) totalTranscendencePoints.textContent = GAME.state.transcendencePoints || 0;
    },

    /**
     * Setup prestige layer tab switching
     */
    setupPrestigeLayerTabs() {
        const tabs = document.querySelectorAll('.prestige-layer-tab');
        const layers = document.querySelectorAll('.prestige-layer');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const layer = tab.dataset.layer;

                tabs.forEach(t => t.classList.remove('active'));
                layers.forEach(l => l.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(`${layer}-layer`)?.classList.add('active');
            });
        });
    },

    /**
     * Render prestige upgrades
     */
    renderPrestigeUpgrades() {
        const container = document.getElementById('prestigeUpgrades');
        if (!container) return;
        container.innerHTML = '';

        for (const [key, config] of Object.entries(GAME.CONFIG.PRESTIGE_UPGRADES)) {
            const current = GAME.state.prestigeUpgrades[key];
            const level = current?.level || 0;
            const cost = GAME.getPrestigeUpgradeCost(key);
            const canAfford = GAME.state.prestigePoints >= cost;
            const maxed = config.maxLevel && level >= config.maxLevel;

            const card = document.createElement('div');
            card.className = 'prestige-upgrade-card' + (maxed ? ' maxed' : '');
            
            // Special styling for Space Station
            if (key === 'spacestation') {
                card.classList.add('special-upgrade');
            }
            
            card.innerHTML = `
                <h3>${config.name}</h3>
                ${config.description ? `<p class="upgrade-desc">${config.description}</p>` : ''}
                <p class="upgrade-level">Level: ${level}${config.maxLevel ? '/' + config.maxLevel : ''}</p>
                <div class="upgrade-cost">Cost: ${cost} PP</div>
                <button class="prestige-upgrade-button" ${!canAfford || maxed ? 'disabled' : ''}>
                    ${maxed ? '✓ Owned' : 'Buy'}
                </button>
            `;
            
            card.querySelector('button').addEventListener('click', () => {
                if (GAME.buyPrestigeUpgrade(key)) {
                    GAME.saveGame();
                    this.updateBuildingSelector(); // Refresh building list
                    this.setupPrestigeTab();
                }
            });
            
            container.appendChild(card);
        }
    },

    /**
     * Render ascension upgrades
     */
    renderAscensionUpgrades() {
        const container = document.getElementById('ascensionUpgrades');
        if (!container) return;
        container.innerHTML = '';

        for (const [key, config] of Object.entries(GAME.CONFIG.ASCENSION_UPGRADES)) {
            const current = GAME.state.ascensionUpgrades[key];
            const level = current?.level || 0;
            const cost = GAME.getAscensionUpgradeCost(key);
            const canAfford = GAME.state.ascensionPoints >= cost;
            const maxed = config.maxLevel && level >= config.maxLevel;

            const card = document.createElement('div');
            card.className = 'prestige-upgrade-card' + (maxed ? ' maxed' : '');
            card.innerHTML = `
                <h3>${config.name}</h3>
                <p class="upgrade-desc">${config.description}</p>
                <p class="upgrade-level">Level: ${level}${config.maxLevel ? '/' + config.maxLevel : ''}</p>
                <div class="upgrade-cost">Cost: ${cost} AP</div>
                <button class="prestige-upgrade-button ascension" ${!canAfford || maxed ? 'disabled' : ''}>
                    ${maxed ? 'Maxed' : 'Buy'}
                </button>
            `;
            
            card.querySelector('button').addEventListener('click', () => {
                if (GAME.buyAscensionUpgrade(key)) {
                    GAME.saveGame();
                    this.setupPrestigeTab();
                }
            });
            
            container.appendChild(card);
        }
    },

    /**
     * Render transcendence upgrades
     */
    renderTranscendenceUpgrades() {
        const container = document.getElementById('transcendenceUpgrades');
        if (!container) return;
        container.innerHTML = '';

        for (const [key, config] of Object.entries(GAME.CONFIG.TRANSCENDENCE_UPGRADES)) {
            const current = GAME.state.transcendenceUpgrades[key];
            const level = current?.level || 0;
            const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
            const canAfford = GAME.state.transcendencePoints >= cost;
            const maxed = config.maxLevel && level >= config.maxLevel;

            const card = document.createElement('div');
            card.className = 'prestige-upgrade-card' + (maxed ? ' maxed' : '');
            card.innerHTML = `
                <h3>${config.name}</h3>
                <p class="upgrade-desc">${config.description}</p>
                <p class="upgrade-level">Level: ${level}${config.maxLevel ? '/' + config.maxLevel : ''}</p>
                <div class="upgrade-cost">Cost: ${cost} TP</div>
                <button class="prestige-upgrade-button transcendence" ${!canAfford || maxed ? 'disabled' : ''}>
                    ${maxed ? 'Maxed' : 'Buy'}
                </button>
            `;
            
            card.querySelector('button').addEventListener('click', () => {
                if (GAME.buyTranscendenceUpgrade(key)) {
                    GAME.saveGame();
                    this.setupPrestigeTab();
                }
            });
            
            container.appendChild(card);
        }
    },

    /**
     * Render unlockable content
     */
    renderUnlocks() {
        const container = document.getElementById('unlocksGrid');
        if (!container) return;
        container.innerHTML = '';

        for (const [key, unlock] of Object.entries(GAME.CONFIG.UNLOCKABLES)) {
            const isUnlocked = GAME.state.unlockedContent?.has(key);
            
            const card = document.createElement('div');
            card.className = `unlock-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            card.innerHTML = `
                <div class="unlock-icon">${unlock.icon}</div>
                <div class="unlock-info">
                    <h4>${unlock.name}</h4>
                    <p>${unlock.description}</p>
                    <span class="unlock-requirement">${this.getUnlockRequirementText(unlock.requirement)}</span>
                </div>
                <div class="unlock-status">${isUnlocked ? '✅' : '🔒'}</div>
            `;
            
            container.appendChild(card);
        }
    },

    /**
     * Get human-readable unlock requirement text
     */
    getUnlockRequirementText(req) {
        switch (req.type) {
            case 'prestigeLevel': return `Prestige Level ${req.value}`;
            case 'ascensionLevel': return `Ascension Level ${req.value}`;
            case 'coins': return `${GAME.formatNumber(req.value)} coins`;
            case 'totalCoinsEarned': return `${GAME.formatNumber(req.value)} total coins`;
            case 'casinoGamesPlayed': return `${req.value} casino games`;
            case 'casinoTotalWon': return `${GAME.formatNumber(req.value)} casino winnings`;
            case 'totalServers': return `${req.value} servers`;
            case 'totalGenerators': return `${req.value} generators`;
            case 'researchCompleted': return `${req.value} research`;
            case 'achievements': return `${req.value} achievements`;
            default: return 'Unknown requirement';
        }
    },

    /**
     * Setup floating balance display that appears when header is scrolled away
     */
    setupFloatingBalance() {
        const header = document.querySelector('.header');
        const floatingBalance = document.getElementById('floatingBalance');
        
        if (!header || !floatingBalance) return;
        
        // Use Intersection Observer to detect when header is out of view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Header is visible, hide floating balance
                    floatingBalance.classList.remove('visible');
                } else {
                    // Header is not visible, show floating balance
                    floatingBalance.classList.add('visible');
                }
            });
        }, {
            threshold: 0,
            rootMargin: '-50px 0px 0px 0px' // Trigger a bit before header fully disappears
        });
        
        observer.observe(header);
    },

    /**
     * Setup casino tab
     */
    setupCasinoTab() {
        try {
            // Backwards-compatibility: some builds expect an element with id "casinoMain".
            // If it's not present in the DOM, create a lightweight container inside the
            // existing casino container so older setup code can safely reference it.
            try {
                if (!document.getElementById('casinoMain')) {
                    const casinoContainer = document.querySelector('#casino-tab .casino-container') || document.getElementById('casino-tab');
                    if (casinoContainer) {
                        const main = document.createElement('div');
                        main.id = 'casinoMain';
                        // keep it visually inert; actual game panels live elsewhere
                        main.style.display = 'contents';
                        casinoContainer.appendChild(main);
                    }
                }
            } catch(e) { /* non-fatal fallback creation failed; continue anyway */ }
            const safe = (fnName) => {
                try {
                    if (typeof this[fnName] === 'function') this[fnName]();
                } catch (err) {
                    console.warn(`UI.setupCasinoTab: ${fnName} failed`, err);
                }
            };

            safe('updateCasinoStats');
            safe('setupCasinoSubTabs');
            safe('setupCoinFlip');
            safe('setupDiceRoll');
            safe('setupSlots');
            safe('setupBlackjack');
            safe('setupMidas');
            safe('setupWheel');
            safe('setupPoker');
            safe('setupPlinko');
            safe('setupMines');
            safe('setupCrash');
            safe('setupDragon');
            safe('setupCosmic');
            safe('setupCandy');
            safe('setupQuickBetButtons');
            safe('setupVipSystem');
            safe('setupJackpotSystem');

            // Setup casino mute buttons after a short delay to ensure DOM is ready
            setTimeout(() => {
                try { safe('setupCasinoMuteButtons'); } catch(e) { console.warn('setupCasinoMuteButtons scheduling failed', e); }
            }, 100);
        } catch (e) {
            console.error('UI.setupCasinoTab error', e);
            try { const main = document.getElementById('casinoMain'); if (main) main.innerHTML = '<div class="error">Failed to load Casino. See console.</div>'; } catch(e){}
        }
    },

    /**
     * Setup VIP Loyalty System
     */
    setupVipSystem() {
        // Update VIP display
        this.updateVipDisplay();
        
        // VIP Rewards Modal
        const openBtn = document.getElementById('openVipRewardsBtn');
        const modal = document.getElementById('vipRewardsModal');
        const closeBtn = document.getElementById('closeVipModal');
        
        if (openBtn && modal) {
            openBtn.addEventListener('click', () => {
                this.updateVipModal();
                modal.classList.add('active');
            });
        }
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // Daily VIP Claim
        const claimBtn = document.getElementById('claimDailyVipBtn');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                if (GAME.canClaimVipDaily()) {
                    const reward = GAME.claimVipDaily();
                    if (reward > 0) {
                        this.showNotification(`🎁 Claimed ${GAME.formatNumber(reward)} VIP coins!`, 'success');
                        this.updateVipModal();
                        this.updateVipDisplay();
                        this.updateDisplay();
                    }
                } else {
                    this.showNotification('⏰ Already claimed today! Come back tomorrow.', 'error');
                }
            });
        }
    },

    /**
     * Update VIP banner display
     */
    updateVipDisplay() {
        const tier = GAME.getVipTier();
        const level = GAME.state.vipLevel || 1;
        const xp = GAME.state.vipXp || 0;
        const xpNeeded = GAME.getVipXpRequired(level);
        
        // Update tier info
        const iconEl = document.getElementById('vipIcon');
        const tierEl = document.getElementById('vipTier');
        const levelEl = document.getElementById('vipLevel');
        
        if (iconEl) iconEl.textContent = tier.icon;
        if (tierEl) tierEl.textContent = tier.name;
        if (levelEl) levelEl.textContent = level;
        
        // Update XP bar
        const xpFill = document.getElementById('vipXpFill');
        const xpText = document.getElementById('vipXp');
        const xpNeededEl = document.getElementById('vipXpNeeded');
        
        if (xpFill) xpFill.style.width = `${(xp / xpNeeded) * 100}%`;
        if (xpText) xpText.textContent = GAME.formatNumber(xp);
        if (xpNeededEl) xpNeededEl.textContent = GAME.formatNumber(xpNeeded);
        
        // Update perks
        const winBonusEl = document.getElementById('vipWinBonus');
        const cashbackEl = document.getElementById('vipCashback');
        const freeSpinsEl = document.getElementById('vipFreeSpins');
        
        if (winBonusEl) winBonusEl.textContent = GAME.getVipWinBonus();
        if (cashbackEl) cashbackEl.textContent = GAME.getVipCashback();
        if (freeSpinsEl) freeSpinsEl.textContent = GAME.getVipFreeSpins();
    },

    /**
     * Update VIP Rewards Modal
     */
    updateVipModal() {
        const tier = GAME.getVipTier();
        
        // Highlight current tier
        const tierCards = document.querySelectorAll('.vip-tier-card');
        tierCards.forEach(card => {
            const cardTier = card.dataset.tier;
            card.classList.toggle('current', cardTier === tier.id);
        });
        
        // Update daily reward amount
        const rewardAmountEl = document.getElementById('dailyVipRewardAmount');
        if (rewardAmountEl) {
            rewardAmountEl.textContent = '+' + GAME.formatNumber(GAME.getVipDailyReward());
        }
        
        // Update claim button and timer
        const claimBtn = document.getElementById('claimDailyVipBtn');
        const timerEl = document.getElementById('vipClaimTimer');
        
        if (claimBtn && timerEl) {
            if (GAME.canClaimVipDaily()) {
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim Daily Reward';
                timerEl.textContent = '';
            } else {
                claimBtn.disabled = true;
                claimBtn.textContent = 'Already Claimed';
                
                // Calculate time until next claim
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setHours(24, 0, 0, 0);
                const timeLeft = tomorrow - now;
                
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                timerEl.textContent = `Next claim in ${hours}h ${minutes}m`;
            }
        }
    },

    /**
     * Setup Jackpot System
     */
    setupJackpotSystem() {
        this.updateJackpotDisplay();
        
        const spinBtn = document.getElementById('spinJackpotBtn');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => {
                const cost = GAME.JACKPOT_CONFIG.spinCost;
                
                if (GAME.state.coins < cost) {
                    this.showNotification(`❌ Need ${GAME.formatNumber(cost)} coins for a jackpot ticket!`, 'error');
                    return;
                }
                
                // Buy ticket
                if (GAME.buyJackpotTicket()) {
                    this.showNotification(`🎫 Jackpot ticket purchased! You now have ${GAME.state.jackpotTickets} tickets.`, 'info');
                    
                    // Spin for jackpot
                    const result = GAME.spinJackpot();
                    
                    if (result.won) {
                        // Show jackpot win modal
                        this.showJackpotWin(result.amount);
                    } else {
                        this.showNotification(`😢 No jackpot this time... ${GAME.state.jackpotTickets} tickets remaining.`, 'warning');
                    }
                    
                    this.updateJackpotDisplay();
                    this.updateVipDisplay();
                    this.updateDisplay();
                }
            });
        }
        
        // Jackpot win modal close
        const closeJackpotBtn = document.getElementById('closeJackpotWinModal');
        const jackpotModal = document.getElementById('jackpotWinModal');
        
        if (closeJackpotBtn && jackpotModal) {
            closeJackpotBtn.addEventListener('click', () => {
                jackpotModal.classList.remove('active');
            });
        }
    },

    /**
     * Update Jackpot Display
     */
    updateJackpotDisplay() {
        const amountEl = document.getElementById('jackpotAmount');
        const ticketsEl = document.getElementById('jackpotTickets');
        const chanceEl = document.getElementById('jackpotChance');
        const spinBtn = document.getElementById('spinJackpotBtn');
        
        if (amountEl) amountEl.textContent = GAME.formatNumber(GAME.state.jackpotPool || 10000);
        if (ticketsEl) ticketsEl.textContent = GAME.state.jackpotTickets || 0;
        if (chanceEl) chanceEl.textContent = (GAME.getJackpotWinChance() * 100).toFixed(2) + '%';
        if (spinBtn) {
            spinBtn.textContent = `🎰 Spin for Jackpot (${GAME.formatNumber(GAME.JACKPOT_CONFIG.spinCost)})`;
        }
    },

    /**
     * Show Jackpot Win Modal
     */
    showJackpotWin(amount) {
        const modal = document.getElementById('jackpotWinModal');
        const amountEl = document.getElementById('jackpotWinAmount');
        
        if (modal && amountEl) {
            amountEl.textContent = '+' + GAME.formatNumber(amount);
            modal.classList.add('active');
            
            // Play celebration sound
            this.playSound('jackpot');
            
            // Create confetti effect
            this.createConfetti();
        }
    },

    /**
     * Create confetti celebration effect
     */
    createConfetti() {
        const colors = ['#ff00ff', '#00ffff', '#ffd700', '#ff6b6b', '#00ff88'];
        const container = document.getElementById('jackpotWinModal');
        
        if (!container) return;
        
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    left: ${Math.random() * 100}%;
                    top: -10px;
                    transform: rotate(${Math.random() * 360}deg);
                    animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
                    pointer-events: none;
                    z-index: 10001;
                `;
                container.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 4000);
            }, i * 20);
        }
    },

    /**
     * Casino game research requirements mapping
     */
    CASINO_GAME_RESEARCH: {
        'coinflip': null, // Free - no research needed
        'dice': 'casino_dice_unlock',
        'slots': 'casino_slots_unlock',
        'blackjack': 'casino_blackjack_unlock',
        'midas': 'casino_midas_unlock',
        'wheel': 'casino_wheel_unlock',
        'poker': 'casino_poker_unlock',
        'plinko': 'casino_plinko_unlock',
        'mines': 'casino_mines_unlock',
        'crash': 'casino_crash_unlock',
        'dragon': 'casino_dragon_unlock',
        'cosmic': 'casino_cosmic_unlock',
        'candy': 'casino_candy_unlock'
    },

    /**
     * Check if a casino game is unlocked
     */
    isCasinoGameUnlocked(gameId) {
        const researchRequired = this.CASINO_GAME_RESEARCH[gameId];
        if (!researchRequired) return true; // No research needed
        return GAME.isResearchUnlocked(researchRequired);
    },

    /**
     * Update casino game tabs to show locked/unlocked state
     */
    updateCasinoGameTabs() {
        const tabBtns = document.querySelectorAll('.casino-tab-btn');
        tabBtns.forEach(btn => {
            const tabId = btn.dataset.casinoTab;
            const isUnlocked = this.isCasinoGameUnlocked(tabId);
            
            if (isUnlocked) {
                btn.classList.remove('locked');
                btn.removeAttribute('title');
            } else {
                btn.classList.add('locked');
                const researchKey = this.CASINO_GAME_RESEARCH[tabId];
                const research = GAME.CONFIG.RESEARCH_UPGRADES[researchKey];
                btn.title = `Requires: ${research.name} (${research.skillPointCost} SP)`;
            }
        });
    },

    /**
     * Setup casino sub-tab navigation
     */
    setupCasinoSubTabs() {
        const tabBtns = document.querySelectorAll('.casino-tab-btn');
        const panels = document.querySelectorAll('.casino-game-panel');
        
        // Initial update of locked states
        this.updateCasinoGameTabs();
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.casinoTab;
                
                // Check if game is locked
                if (!this.isCasinoGameUnlocked(tabId)) {
                    const researchKey = this.CASINO_GAME_RESEARCH[tabId];
                    const research = GAME.CONFIG.RESEARCH_UPGRADES[researchKey];
                    this.showNotification(`🔒 Requires: ${research.name} (${research.skillPointCost} SP) - Research in Skills tab!`, 'error');
                    return;
                }
                
                // Remove active from all
                tabBtns.forEach(b => b.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                
                // Add active to clicked
                btn.classList.add('active');
                const targetPanel = document.getElementById(`casino-${tabId}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    
                    // Scroll to the game panel smoothly
                    setTimeout(() => {
                        const gameElement = targetPanel.querySelector('.casino-game');
                        if (gameElement) {
                            gameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 50);
                }
            });
        });
    },

    /**
     * Update casino statistics display
     */
    updateCasinoStats() {
        const wageredEl = document.getElementById('casinoTotalWagered');
        const wonEl = document.getElementById('casinoTotalWon');
        const profitEl = document.getElementById('casinoNetProfit');
        
        if (wageredEl) wageredEl.textContent = GAME.formatNumber(GAME.state.casinoTotalWagered || 0);
        if (wonEl) wonEl.textContent = GAME.formatNumber(GAME.state.casinoTotalWon || 0);
        
        const netProfit = (GAME.state.casinoTotalWon || 0) - (GAME.state.casinoTotalWagered || 0);
        if (profitEl) {
            profitEl.textContent = GAME.formatNumber(Math.abs(netProfit));
            profitEl.className = 'value ' + (netProfit >= 0 ? 'positive' : 'negative');
            profitEl.textContent = (netProfit >= 0 ? '+' : '-') + GAME.formatNumber(Math.abs(netProfit));
        }
        
        // Also update VIP and Jackpot displays
        this.updateVipDisplay();
        this.updateJackpotDisplay();
        
        // Also update daily challenges
        this.renderDailyChallenges();
    },

    /**
     * Track a casino game for daily challenges
     */
    trackCasinoGame(bet, winAmount = 0) {
        GAME.updateDailyProgress('casino_games', 1);
        GAME.updateDailyProgress('casino_wagered', bet);
        if (winAmount > 0) {
            GAME.trackCasinoWin(bet, winAmount);
        }
    },

    /**
     * Process a casino bet - handles coins, VIP XP, jackpot pool
     */
    processCasinoBet(bet) {
        if (bet <= 0 || GAME.state.coins < bet) return false;
        
        // Deduct bet
        GAME.state.coins -= bet;
        GAME.state.casinoTotalWagered = (GAME.state.casinoTotalWagered || 0) + bet;
        GAME.state.casinoGamesPlayed = (GAME.state.casinoGamesPlayed || 0) + 1;
        
        // Add VIP XP (1 XP per coin wagered, min 1)
        GAME.addVipXp(Math.max(1, Math.floor(bet / 10)));
        
        // Contribute to jackpot pool
        GAME.addToJackpotPool(bet);
        
        return true;
    },

    /**
     * Process a casino win - applies VIP bonus
     */
    processCasinoWin(baseWin, bet) {
        // Apply VIP win bonus
        const vipBonus = 1 + (GAME.getVipWinBonus() / 100);
        const winAmount = Math.floor(baseWin * vipBonus);
        
        GAME.state.coins += winAmount;
        GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winAmount;
        
        // Track biggest win
        if (winAmount > (GAME.state.casinoBiggestWin || 0)) {
            GAME.state.casinoBiggestWin = winAmount;
        }
        
        return winAmount;
    },

    /**
     * Process a casino loss - applies VIP cashback
     */
    processCasinoLoss(bet) {
        const cashbackPercent = GAME.getVipCashback();
        if (cashbackPercent > 0) {
            const cashback = Math.floor(bet * (cashbackPercent / 100));
            if (cashback > 0) {
                GAME.state.coins += cashback;
                this.showFloatingText(`+${GAME.formatNumber(cashback)} cashback!`, 'info');
            }
        }
    },

    /**
     * Setup quick bet buttons for all games
     */
    setupQuickBetButtons() {
        // Setup all bet inputs with formatting
        this.setupBetInputFormatting();
        
        document.querySelectorAll('.quick-bet').forEach(btn => {
            btn.addEventListener('click', () => {
                const game = btn.dataset.game;
                const amount = btn.dataset.amount;
                let inputId;
                
                switch(game) {
                    case 'coinFlip': inputId = 'coinFlipBet'; break;
                    case 'diceRoll': inputId = 'diceRollBet'; break;
                    case 'slots': inputId = 'slotsBet'; break;
                    case 'blackjack': inputId = 'blackjackBet'; break;
                    case 'midas': inputId = 'midasBet'; break;
                    case 'wheel': inputId = 'wheelBet'; break;
                    case 'poker': inputId = 'pokerBet'; break;
                    case 'plinko': inputId = 'plinkoBet'; break;
                    case 'mines': inputId = 'minesBet'; break;
                    case 'crash': inputId = 'crashBet'; break;
                    case 'dragon': inputId = 'dragonBet'; break;
                    case 'cosmic': inputId = 'cosmicBet'; break;
                    case 'candy': inputId = 'candyBet'; break;
                }
                
                const input = document.getElementById(inputId);
                if (input) {
                    let value;
                    if (amount === 'max') {
                        value = Math.floor(GAME.state.coins);
                    } else {
                        value = parseInt(amount);
                    }
                    // Store as number, not string to avoid scientific notation issues
                    input.dataset.rawValue = this.numberToFullString(value);
                    input.value = this.formatBetDisplay(value);
                    
                    // Update golden spin cost for midas
                    if (game === 'midas') {
                        this.updateGoldenSpinCost();
                    }
                    // Update bonus cost for candy
                    if (game === 'candy') {
                        this.updateCandyBonusCost();
                    }
                }
            });
        });
    },

    /**
     * Convert a number to full string without scientific notation
     */
    numberToFullString(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        
        num = Math.floor(num);
        
        // Handle numbers that JavaScript would display in scientific notation
        if (num >= 1e21 || num <= -1e21) {
            // Manual conversion to avoid scientific notation
            let str = num.toString();
            if (str.includes('e') || str.includes('E')) {
                const [mantissa, exp] = str.toLowerCase().split('e');
                const exponent = parseInt(exp);
                const [intPart, decPart = ''] = mantissa.split('.');
                const digits = intPart + decPart;
                const zerosNeeded = exponent - decPart.length;
                
                if (zerosNeeded >= 0) {
                    return digits + '0'.repeat(zerosNeeded);
                }
            }
        }
        
        return num.toString();
    },

    /**
     * Format a number for bet display (abbreviated)
     */
    formatBetDisplay(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        if (num >= 1e18) return (num / 1e18).toFixed(2).replace(/\.?0+$/, '') + 'Qn';
        if (num >= 1e15) return (num / 1e15).toFixed(2).replace(/\.?0+$/, '') + 'Qd';
        if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2).replace(/\.?0+$/, '') + 'K';
        return Math.floor(num).toString();
    },

    /**
     * Parse abbreviated bet input (e.g., "1K" -> 1000)
     */
    parseBetInput(value) {
        if (typeof value === 'number') return Math.floor(value);
        if (!value || value === '') return 0;
        
        const str = value.toString().trim();
        
        // Handle scientific notation first (e.g., 1.87e+21)
        if (str.includes('e') || str.includes('E')) {
            const parsed = parseFloat(str);
            if (!isNaN(parsed) && isFinite(parsed)) {
                return Math.floor(parsed);
            }
        }
        
        const upperStr = str.toUpperCase();
        
        // Order matters - check longer suffixes first!
        const multipliers = [
            { suffix: 'QN', mult: 1e18 },
            { suffix: 'QD', mult: 1e15 },
            { suffix: 'T', mult: 1e12 },
            { suffix: 'B', mult: 1e9 },
            { suffix: 'M', mult: 1e6 },
            { suffix: 'K', mult: 1e3 }
        ];
        
        // Check for suffix
        for (const { suffix, mult } of multipliers) {
            if (upperStr.endsWith(suffix)) {
                const numPart = parseFloat(upperStr.slice(0, -suffix.length));
                if (!isNaN(numPart) && numPart > 0) {
                    return Math.floor(numPart * mult);
                }
            }
        }
        
        // No suffix, parse as regular number
        const parsed = parseFloat(str.replace(/,/g, ''));
        if (!isNaN(parsed) && isFinite(parsed)) {
            return Math.floor(parsed);
        }
        
        return 0;
    },

    /**
     * Setup bet input formatting for all casino games
     */
    setupBetInputFormatting() {
        const betInputIds = ['coinFlipBet', 'diceRollBet', 'slotsBet', 'blackjackBet', 'midasBet', 'wheelBet', 'pokerBet', 'plinkoBet', 'minesBet', 'crashBet', 'dragonBet', 'cosmicBet'];
        
        betInputIds.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (!input) return;
            
            // Store raw value in data attribute
            input.dataset.rawValue = input.value || '10';
            
            // Change input type to text to allow abbreviations
            input.type = 'text';
            input.value = this.formatBetDisplay(parseInt(input.dataset.rawValue));
            
            // On focus, show raw number for easy editing
            input.addEventListener('focus', () => {
                input.value = input.dataset.rawValue;
                input.select();
            });
            
            // On blur, format the display
            input.addEventListener('blur', () => {
                const parsed = this.parseBetInput(input.value);
                input.dataset.rawValue = this.numberToFullString(parsed);
                input.value = this.formatBetDisplay(parsed);
                
                // Update golden spin cost for midas
                if (inputId === 'midasBet') {
                    this.updateGoldenSpinCost();
                }
            });
            
            // Allow typing abbreviations
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        });
    },

    /**
     * Get actual bet value from input (handles abbreviations)
     */
    getBetValue(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return 0;
        
        // First try parsing the raw value
        const rawValue = input.dataset.rawValue;
        if (rawValue) {
            const parsed = this.parseBetInput(rawValue);
            if (parsed > 0) return parsed;
        }
        
        // Fallback to parsing the display value
        return this.parseBetInput(input.value);
    },

    /**
     * Setup casino mute buttons for all games
     */
    setupCasinoMuteButtons() {
        // Initialize mutedGames if it doesn't exist
        if (!GAME.state.mutedGames) {
            GAME.state.mutedGames = {};
        }

        // Setup mute buttons for all casino games
        const gameIds = ['coinflip', 'dice', 'slots', 'blackjack', 'midas', 'wheel', 'poker', 'plinko', 'mines', 'crash', 'dragon', 'cosmic', 'candy'];

        gameIds.forEach(gameId => {
            const muteBtn = document.getElementById(`${gameId}MuteBtn`);
            if (muteBtn) {
                if (!muteBtn.dataset.muteListenerAttached) {
                    muteBtn.addEventListener('click', () => {
                        this.toggleGameMute(gameId);
                    });
                    muteBtn.dataset.muteListenerAttached = 'true';
                }
                // Always set initial state
                this.updateMuteButtonState(gameId);
            }
        });
    },

    /**
     * Toggle mute state for a specific game
     */
    toggleGameMute(gameId) {
        if (!GAME.state.mutedGames) {
            GAME.state.mutedGames = {};
        }

        // Get current mute state
        const wasMuted = this.isGameMuted(gameId);
        
        // Toggle the state
        GAME.state.mutedGames[gameId] = !wasMuted;

        // Update button appearance
        this.updateMuteButtonState(gameId);
        
        // Save game state
        GAME.saveGame();

        // Show notification with new state
        const isNowMuted = !wasMuted;
        const gameName = this.getGameDisplayName(gameId);
        this.showNotification(`${isNowMuted ? '🔇' : '🔊'} ${gameName} sounds ${isNowMuted ? 'muted' : 'unmuted'}`, 'info');
    },

    /**
     * Check if a game is muted
     */
    isGameMuted(gameId) {
        return GAME.state.mutedGames && GAME.state.mutedGames[gameId] === true;
    },

    /**
     * Update mute button visual state
     */
    updateMuteButtonState(gameId) {
        const muteBtn = document.getElementById(`${gameId}MuteBtn`);
        if (muteBtn) {
            const isMuted = this.isGameMuted(gameId);
            muteBtn.classList.toggle('muted', isMuted);
        }
    },

    /**
     * Get display name for a game
     */
    getGameDisplayName(gameId) {
        const names = {
            'coinflip': 'Coin Flip',
            'dice': 'Dice Roll',
            'slots': 'Slots',
            'blackjack': 'Blackjack',
            'midas': 'Foot of Zeus',
            'wheel': 'Wheel of Fortune',
            'poker': 'Texas Hold\'em',
            'plinko': 'Plinko',
            'mines': 'Mines',
            'crash': 'Crash',
            'dragon': 'Dragon\'s Hoard',
            'cosmic': 'Cosmic Explorer',
            'candy': 'Candy Cascade'
        };
        return names[gameId] || gameId;
    },

    /**
     * Setup coin flip game
     */
    setupCoinFlip() {
        const headsBtn = document.getElementById('flipHeads');
        const tailsBtn = document.getElementById('flipTails');
        const resultDiv = document.getElementById('coinFlipResult');
        
        const playFlip = (choice) => {
            const bet = this.getBetValue('coinFlipBet');
            
            if (bet <= 0) {
                resultDiv.textContent = 'Enter a valid bet amount!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            if (bet > GAME.state.coins) {
                resultDiv.textContent = 'Not enough coins!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
            if (!this.processCasinoBet(bet)) {
                resultDiv.textContent = 'Bet processing failed!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            // Play coin flip sound if not muted
            if (!this.isGameMuted('coinflip')) {
                this.playSound('coinflip_spin');
            }
            
            // Random result
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = result === choice;
            
            if (won) {
                const winnings = bet * 2;
                GAME.state.coins += winnings;
                GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winnings;
                this.trackCasinoGame(bet, winnings);
                resultDiv.innerHTML = `🎉 ${result.toUpperCase()}! You won ${GAME.formatNumber(winnings)} coins!`;
                resultDiv.className = 'game-result win';
                if (!this.isGameMuted('coinflip')) {
                    this.playSound('win');
                }
            } else {
                this.trackCasinoGame(bet, 0);
                resultDiv.innerHTML = `😢 ${result.toUpperCase()}! You lost ${GAME.formatNumber(bet)} coins.`;
                resultDiv.className = 'game-result lose';
                if (!this.isGameMuted('coinflip')) {
                    this.playSound('lose');
                }
            }
            
            this.updateCasinoStats();
            this.updateDisplay();
            GAME.saveGame();
        };
        
        headsBtn.onclick = () => playFlip('heads');
        tailsBtn.onclick = () => playFlip('tails');
    },

    /**
     * Setup dice roll game
     */
    setupDiceRoll() {
        const slider = document.getElementById('diceTargetSlider');
        const targetValue = document.getElementById('diceTargetValue');
        const winChance = document.getElementById('diceWinChance');
        const multiplier = document.getElementById('diceMultiplier');
        const underBtn = document.getElementById('rollUnder');
        const overBtn = document.getElementById('rollOver');
        const resultDiv = document.getElementById('diceRollResult');
        
        const updateOdds = () => {
            const target = parseInt(slider.value);
            targetValue.textContent = target;
            
            // Calculate odds for "under" bet
            const underChance = target - 1; // Numbers 1 to target-1
            const overChance = 100 - target; // Numbers target+1 to 100
            
            winChance.textContent = `${underChance}% / ${overChance}%`;
            
            // Multiplier with 2% house edge
            const underMult = (98 / underChance).toFixed(2);
            const overMult = (98 / overChance).toFixed(2);
            multiplier.textContent = `${underMult}x / ${overMult}x`;
        };
        
        slider.oninput = updateOdds;
        updateOdds();
        
        const playDice = (isUnder) => {
            const bet = this.getBetValue('diceRollBet');
            const target = parseInt(slider.value);
            
            if (bet <= 0) {
                resultDiv.textContent = 'Enter a valid bet amount!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            if (bet > GAME.state.coins) {
                resultDiv.textContent = 'Not enough coins!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            // Deduct bet
            // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
            if (!this.processCasinoBet(bet)) {
                resultDiv.textContent = 'Bet processing failed!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            // Play dice roll sound if not muted
            if (!this.isGameMuted('dice')) {
                this.playSound('dice_roll');
            }
            
            // Roll 1-100
            const roll = Math.floor(Math.random() * 100) + 1;
            let won = false;
            let mult = 1;
            
            if (isUnder) {
                won = roll < target;
                mult = 98 / (target - 1);
            } else {
                won = roll > target;
                mult = 98 / (100 - target);
            }
            
            if (won) {
                const winnings = Math.floor(bet * mult);
                GAME.state.coins += winnings;
                GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winnings;
                this.trackCasinoGame(bet, winnings);
                resultDiv.innerHTML = `🎲 Rolled ${roll}! You won ${GAME.formatNumber(winnings)} coins! (${mult.toFixed(2)}x)`;
                resultDiv.className = 'game-result win';
                if (!this.isGameMuted('dice')) {
                    this.playSound('win');
                }
            } else {
                this.trackCasinoGame(bet, 0);
                resultDiv.innerHTML = `🎲 Rolled ${roll}! You lost ${GAME.formatNumber(bet)} coins.`;
                resultDiv.className = 'game-result lose';
                if (!this.isGameMuted('dice')) {
                    this.playSound('lose');
                }
            }
            
            this.updateCasinoStats();
            this.updateDisplay();
            GAME.saveGame();
        };
        
        underBtn.onclick = () => playDice(true);
        overBtn.onclick = () => playDice(false);
    },

    /**
     * Setup slot machine game
     */
    setupSlots() {
        const spinBtn = document.getElementById('spinSlots');
        const resultDiv = document.getElementById('slotsResult');
        const slot1 = document.getElementById('slot1');
        const slot2 = document.getElementById('slot2');
        const slot3 = document.getElementById('slot3');
        
        const symbols = ['🍒', '⭐', '🍀', '7️⃣', '💎'];
        const weights = [35, 30, 20, 10, 5]; // Probability weights
        
        const getRandomSymbol = () => {
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let random = Math.random() * totalWeight;
            
            for (let i = 0; i < symbols.length; i++) {
                random -= weights[i];
                if (random <= 0) return symbols[i];
            }
            return symbols[0];
        };
        
        const getMultiplier = (s1, s2, s3) => {
            // Three of a kind
            if (s1 === s2 && s2 === s3) {
                switch (s1) {
                    case '💎': return 50;
                    case '7️⃣': return 25;
                    case '🍀': return 10;
                    case '⭐': return 5;
                    case '🍒': return 3;
                }
            }
            // Two of a kind
            if (s1 === s2 || s2 === s3 || s1 === s3) {
                return 1.5;
            }
            return 0;
        };
        
        spinBtn.onclick = () => {
            const bet = this.getBetValue('slotsBet');
            
            if (bet <= 0) {
                resultDiv.textContent = 'Enter a valid bet amount!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            if (bet > GAME.state.coins) {
                resultDiv.textContent = 'Not enough coins!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            // Deduct bet
            // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
            if (!this.processCasinoBet(bet)) {
                resultDiv.textContent = 'Bet processing failed!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            // Play slots spin sound if not muted
            if (!this.isGameMuted('slots')) {
                this.playSound('slots_spin');
            }
            
            // Disable button during spin
            spinBtn.disabled = true;
            
            // Spinning animation
            slot1.classList.add('spinning');
            slot2.classList.add('spinning');
            slot3.classList.add('spinning');
            
            let spinCount = 0;
            const spinInterval = setInterval(() => {
                slot1.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                slot2.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                slot3.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                spinCount++;
                
                if (spinCount >= 20) {
                    clearInterval(spinInterval);
                    
                    // Final result
                    const s1 = getRandomSymbol();
                    const s2 = getRandomSymbol();
                    const s3 = getRandomSymbol();
                    
                    slot1.textContent = s1;
                    slot2.textContent = s2;
                    slot3.textContent = s3;
                    
                    slot1.classList.remove('spinning');
                    slot2.classList.remove('spinning');
                    slot3.classList.remove('spinning');
                    
                    const mult = getMultiplier(s1, s2, s3);
                    
                    if (mult > 0) {
                        const winnings = Math.floor(bet * mult);
                        GAME.state.coins += winnings;
                        GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winnings;
                        this.trackCasinoGame(bet, winnings);
                        resultDiv.innerHTML = `🎰 ${s1}${s2}${s3} - You won ${GAME.formatNumber(winnings)} coins! (${mult}x)`;
                        resultDiv.className = 'game-result win';
                        if (!this.isGameMuted('slots')) {
                            this.playSound('win');
                        }
                    } else {
                        this.trackCasinoGame(bet, 0);
                        resultDiv.innerHTML = `🎰 ${s1}${s2}${s3} - No match. You lost ${GAME.formatNumber(bet)} coins.`;
                        resultDiv.className = 'game-result lose';
                        if (!this.isGameMuted('slots')) {
                            this.playSound('lose');
                        }
                    }
                    
                    this.updateCasinoStats();
                    this.updateDisplay();
                    GAME.saveGame();
                    spinBtn.disabled = false;
                }
            }, 50);
        };
    },

    /**
     * Blackjack game state
     */
    blackjackState: {
        deck: [],
        playerHand: [],
        dealerHand: [],
        currentBet: 0,
        gameActive: false
    },

    /**
     * Setup blackjack game
     */
    setupBlackjack() {
        const dealBtn = document.getElementById('dealBlackjack');
        const hitBtn = document.getElementById('bjHit');
        const standBtn = document.getElementById('bjStand');
        const doubleBtn = document.getElementById('bjDouble');
        
        dealBtn.onclick = () => this.startBlackjack();
        hitBtn.onclick = () => this.blackjackHit();
        standBtn.onclick = () => this.blackjackStand();
        doubleBtn.onclick = () => this.blackjackDouble();
    },

    /**
     * Create a new deck of cards
     */
    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];
        
        for (const suit of suits) {
            for (const value of values) {
                deck.push({ suit, value });
            }
        }
        
        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        return deck;
    },

    /**
     * Get card value for blackjack
     */
    getCardValue(card) {
        if (['J', 'Q', 'K'].includes(card.value)) return 10;
        if (card.value === 'A') return 11;
        return parseInt(card.value);
    },

    /**
     * Calculate hand value with ace handling
     */
    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;
        
        for (const card of hand) {
            value += this.getCardValue(card);
            if (card.value === 'A') aces++;
        }
        
        // Convert aces from 11 to 1 if busting
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    },

    /**
     * Render a card element
     */
    renderCard(card, hidden = false) {
        const cardEl = document.createElement('div');
        const isRed = ['♥', '♦'].includes(card.suit);
        
        if (hidden) {
            cardEl.className = 'playing-card hidden-card';
        } else {
            cardEl.className = `playing-card ${isRed ? 'red' : 'black'}`;
            cardEl.innerHTML = `
                <span class="card-value">${card.value}</span>
                <span class="card-suit">${card.suit}</span>
            `;
        }
        
        return cardEl;
    },

    /**
     * Update the blackjack display
     */
    updateBlackjackDisplay(showDealerCard = false) {
        const playerHand = document.getElementById('playerHand');
        const dealerHand = document.getElementById('dealerHand');
        const playerScore = document.getElementById('bjPlayerScore');
        const dealerScore = document.getElementById('bjDealerScore');
        
        // Clear hands
        playerHand.innerHTML = '';
        dealerHand.innerHTML = '';
        
        // Render player cards
        for (const card of this.blackjackState.playerHand) {
            playerHand.appendChild(this.renderCard(card));
        }
        
        // Render dealer cards (first card hidden unless showing)
        this.blackjackState.dealerHand.forEach((card, index) => {
            if (index === 0 && !showDealerCard) {
                dealerHand.appendChild(this.renderCard(card, true));
            } else {
                dealerHand.appendChild(this.renderCard(card));
            }
        });
        
        // Update scores
        const playerValue = this.calculateHandValue(this.blackjackState.playerHand);
        playerScore.textContent = `(${playerValue})`;
        
        if (showDealerCard) {
            const dealerValue = this.calculateHandValue(this.blackjackState.dealerHand);
            dealerScore.textContent = `(${dealerValue})`;
        } else {
            // Only show value of visible card
            const visibleValue = this.getCardValue(this.blackjackState.dealerHand[1]);
            dealerScore.textContent = `(${visibleValue} + ?)`;
        }
    },

    /**
     * Start a new blackjack game
     */
    startBlackjack() {
        const bet = this.getBetValue('blackjackBet');
        const resultDiv = document.getElementById('blackjackResult');
        const table = document.getElementById('blackjackTable');
        const dealBtn = document.getElementById('dealBlackjack');
        const doubleBtn = document.getElementById('bjDouble');
        
        if (bet <= 0) {
            resultDiv.textContent = 'Enter a valid bet amount!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        if (bet > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Deduct bet
        // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
        if (!this.processCasinoBet(bet)) {
            resultDiv.textContent = 'Bet processing failed!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Initialize game
        this.blackjackState.deck = this.createDeck();
        this.blackjackState.playerHand = [];
        this.blackjackState.dealerHand = [];
        this.blackjackState.currentBet = bet;
        this.blackjackState.gameActive = true;
        
        // Deal initial cards
        this.blackjackState.playerHand.push(this.blackjackState.deck.pop());
        this.blackjackState.dealerHand.push(this.blackjackState.deck.pop());
        this.blackjackState.playerHand.push(this.blackjackState.deck.pop());
        this.blackjackState.dealerHand.push(this.blackjackState.deck.pop());
        
        // Show table
        table.style.display = 'block';
        dealBtn.disabled = true;
        resultDiv.textContent = '';
        resultDiv.className = 'game-result';
        
        // Enable double down only if player can afford it
        doubleBtn.disabled = bet > GAME.state.coins;
        
        this.updateBlackjackDisplay();
        this.updateDisplay();
        
        // Check for blackjack
        const playerValue = this.calculateHandValue(this.blackjackState.playerHand);
        if (playerValue === 21) {
            this.blackjackStand(); // Auto-stand on blackjack
        }
    },

    /**
     * Player hits (takes another card)
     */
    blackjackHit() {
        if (!this.blackjackState.gameActive) return;
        
        // Disable double down after hitting
        document.getElementById('bjDouble').disabled = true;
        
        // Draw card
        this.blackjackState.playerHand.push(this.blackjackState.deck.pop());
        this.updateBlackjackDisplay();
        
        const playerValue = this.calculateHandValue(this.blackjackState.playerHand);
        
        if (playerValue > 21) {
            this.endBlackjack('bust');
        } else if (playerValue === 21) {
            this.blackjackStand();
        }
    },

    /**
     * Player stands (dealer plays)
     */
    blackjackStand() {
        if (!this.blackjackState.gameActive) return;
        
        this.blackjackState.gameActive = false;
        
        // Reveal dealer card and play dealer hand
        this.updateBlackjackDisplay(true);
        
        // Dealer draws until 17
        const dealerPlay = () => {
            const dealerValue = this.calculateHandValue(this.blackjackState.dealerHand);
            
            if (dealerValue < 17) {
                this.blackjackState.dealerHand.push(this.blackjackState.deck.pop());
                this.updateBlackjackDisplay(true);
                setTimeout(dealerPlay, 500);
            } else {
                this.resolveBlackjack();
            }
        };
        
        setTimeout(dealerPlay, 500);
    },

    /**
     * Player doubles down
     */
    blackjackDouble() {
        if (!this.blackjackState.gameActive) return;
        
        const additionalBet = this.blackjackState.currentBet;
        
        if (additionalBet > GAME.state.coins) {
            return;
        }
        
        // Double the bet
        // Process additional bet (deducts coins, adds to jackpot pool, gives VIP XP)
        if (!this.processCasinoBet(additionalBet)) {
            return;
        }
        this.blackjackState.currentBet *= 2;
        
        // Draw one card and stand
        this.blackjackState.playerHand.push(this.blackjackState.deck.pop());
        this.updateBlackjackDisplay();
        this.updateDisplay();
        
        const playerValue = this.calculateHandValue(this.blackjackState.playerHand);
        
        if (playerValue > 21) {
            this.endBlackjack('bust');
        } else {
            this.blackjackStand();
        }
    },

    /**
     * Resolve the blackjack game
     */
    resolveBlackjack() {
        const playerValue = this.calculateHandValue(this.blackjackState.playerHand);
        const dealerValue = this.calculateHandValue(this.blackjackState.dealerHand);
        
        if (dealerValue > 21) {
            this.endBlackjack('dealerBust');
        } else if (playerValue > dealerValue) {
            this.endBlackjack('win');
        } else if (playerValue < dealerValue) {
            this.endBlackjack('lose');
        } else {
            this.endBlackjack('push');
        }
    },

    /**
     * End the blackjack game with result
     */
    endBlackjack(result) {
        this.blackjackState.gameActive = false;
        const resultDiv = document.getElementById('blackjackResult');
        const dealBtn = document.getElementById('dealBlackjack');
        const bet = this.blackjackState.currentBet;
        
        const playerValue = this.calculateHandValue(this.blackjackState.playerHand);
        const isBlackjack = this.blackjackState.playerHand.length === 2 && playerValue === 21;
        
        let winnings = 0;
        let message = '';
        
        switch (result) {
            case 'bust':
                message = `💥 BUST! You went over 21. Lost ${GAME.formatNumber(bet)} coins.`;
                resultDiv.className = 'game-result lose';
                break;
            case 'dealerBust':
                winnings = bet * 2;
                message = `🎉 Dealer BUST! You won ${GAME.formatNumber(winnings)} coins!`;
                resultDiv.className = 'game-result win';
                break;
            case 'win':
                if (isBlackjack) {
                    winnings = Math.floor(bet * 2.5); // Blackjack pays 3:2
                    message = `🃏 BLACKJACK! You won ${GAME.formatNumber(winnings)} coins!`;
                } else {
                    winnings = bet * 2;
                    message = `🎉 You WIN! ${GAME.formatNumber(winnings)} coins!`;
                }
                resultDiv.className = 'game-result win';
                break;
            case 'lose':
                message = `😢 Dealer wins. Lost ${GAME.formatNumber(bet)} coins.`;
                resultDiv.className = 'game-result lose';
                break;
            case 'push':
                winnings = bet; // Return bet
                message = `🤝 PUSH! It's a tie. Bet returned.`;
                resultDiv.className = 'game-result';
                break;
        }
        
        if (winnings > 0) {
            GAME.state.coins += winnings;
            GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winnings;
        }
        
        // Track for daily challenges (push returns bet, not a win)
        if (result === 'push') {
            this.trackCasinoGame(bet, bet); // Not a win, just returned
        } else if (winnings > bet) {
            this.trackCasinoGame(bet, winnings);
        } else {
            this.trackCasinoGame(bet, 0);
        }
        
        resultDiv.innerHTML = message;
        dealBtn.disabled = false;
        
        // Show final hands
        this.updateBlackjackDisplay(true);
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * Foot of Zeus slot game state
     */
    midasState: {
        currentBet: 0,
        multiplier: 1,
        freeSpins: 0,
        freeSpinMultiplier: 1,
        spinning: false,
        grid: [], // 5x3 grid of symbols
        stickyWilds: [], // Positions of sticky wilds during free spins
        // Auto spin state
        autoSpinActive: false,
        autoSpinRemaining: 0,
        autoSpinTotal: 0,
        autoSpinStopOnWin: 0,
        autoSpinStopOnFreeSpins: false,
        autoSpinTotalWon: 0
    },

    // Zeus slot symbols with weights and payouts (lower weight = rarer)
    midasSymbols: [
        { symbol: '🏺', weight: 45, payouts: { 3: 0.5, 4: 2, 5: 10 } },      // Amphora - most common
        { symbol: '🍷', weight: 35, payouts: { 3: 1, 4: 3, 5: 15 } },        // Wine
        { symbol: '🏛️', weight: 25, payouts: { 3: 2, 4: 5, 5: 25 } },       // Temple
        { symbol: '👑', weight: 10, payouts: { 3: 3, 4: 10, 5: 50 } },       // Crown - rare
        { symbol: '⚡', weight: 4, payouts: { 3: 5, 4: 20, 5: 100 }, isWild: true },  // Zeus Lightning - Wild (very rare)
        { symbol: '🌩️', weight: 2, payouts: { 3: 0, 4: 0, 5: 0 }, isScatter: true }   // Thunder Scatter for free spins (very rare)
    ],

    // 20 paylines for 5x3 grid (row indices: 0=top, 1=middle, 2=bottom)
    midasPaylines: [
        [1, 1, 1, 1, 1], // Middle row
        [0, 0, 0, 0, 0], // Top row
        [2, 2, 2, 2, 2], // Bottom row
        [0, 1, 2, 1, 0], // V shape
        [2, 1, 0, 1, 2], // Inverted V
        [0, 0, 1, 2, 2], // Diagonal down
        [2, 2, 1, 0, 0], // Diagonal up
        [1, 0, 0, 0, 1], // Top dip
        [1, 2, 2, 2, 1], // Bottom dip
        [0, 1, 1, 1, 0], // Slight V
        [2, 1, 1, 1, 2], // Slight inverted V
        [1, 0, 1, 0, 1], // Zigzag top
        [1, 2, 1, 2, 1], // Zigzag bottom
        [0, 1, 0, 1, 0], // Wave top
        [2, 1, 2, 1, 2], // Wave bottom
        [1, 1, 0, 1, 1], // Top bump
        [1, 1, 2, 1, 1], // Bottom bump
        [0, 2, 0, 2, 0], // Big zigzag
        [2, 0, 2, 0, 2], // Big zigzag inverted
        [1, 0, 2, 0, 1], // Diamond shape
    ],

    // Wheel of Fortune segments (16 segments, 22.5 degrees each)
    wheelSegments: [
        { mult: 1.5, label: '1.5x' },
        { mult: 2, label: '2x' },
        { mult: 1.2, label: '1.2x' },
        { mult: 3, label: '3x' },
        { mult: 1.5, label: '1.5x' },
        { mult: 5, label: '5x' },
        { mult: 1.2, label: '1.2x' },
        { mult: 2, label: '2x' },
        { mult: 10, label: '10x' },
        { mult: 1.5, label: '1.5x' },
        { mult: 3, label: '3x' },
        { mult: 0, label: '💥 BUST' },
        { mult: 2, label: '2x' },
        { mult: 50, label: '50x' },
        { mult: 1.2, label: '1.2x' },
        { mult: 100, label: '🌟 JACKPOT' }
    ],

    wheelState: {
        spinning: false,
        currentRotation: 0
    },

    /**
     * Setup Wheel of Fortune game
     */
    setupWheel() {
        const spinBtn = document.getElementById('spinWheel');
        if (spinBtn) {
            spinBtn.onclick = () => this.spinWheel();
        }
    },

    /**
     * Spin the Wheel of Fortune
     */
    spinWheel() {
        if (this.wheelState.spinning) return;
        
        const bet = this.getBetValue('wheelBet');
        const resultDiv = document.getElementById('wheelResult');
        const spinBtn = document.getElementById('spinWheel');
        const wheelOuter = document.querySelector('.wheel-outer');
        const wheelSpinner = document.getElementById('wheelSpinner');
        
        if (bet <= 0) {
            resultDiv.textContent = 'Enter a valid bet amount!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        if (bet > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Deduct bet
        // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
        if (!this.processCasinoBet(bet)) {
            resultDiv.textContent = 'Bet processing failed!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        this.wheelState.spinning = true;
        spinBtn.disabled = true;
        wheelOuter.classList.add('wheel-spinning');
        resultDiv.textContent = '🎡 Spinning...';
        resultDiv.className = 'game-result';
        
        // Pick a random segment (0-15)
        const winningSegment = Math.floor(Math.random() * 16);
        const segment = this.wheelSegments[winningSegment];
        
        // Calculate rotation
        // Each segment is 22.5 degrees
        // We want the winning segment to stop at the top (pointer position)
        // Add multiple full rotations for effect
        const fullRotations = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
        const segmentAngle = 22.5;
        // The pointer is at the top, segment 0 starts at 0 degrees
        // To land on segment N, we need to rotate so that segment is at top
        const targetAngle = (360 - (winningSegment * segmentAngle)) - (segmentAngle / 2);
        const totalRotation = this.wheelState.currentRotation + (fullRotations * 360) + targetAngle - (this.wheelState.currentRotation % 360);
        
        this.wheelState.currentRotation = totalRotation;
        wheelSpinner.style.transform = `rotate(${totalRotation}deg)`;
        
        // Wait for spin to complete
        setTimeout(() => {
            this.wheelState.spinning = false;
            spinBtn.disabled = false;
            wheelOuter.classList.remove('wheel-spinning');
            
            const winAmount = Math.floor(bet * segment.mult);
            
            if (segment.mult === 0) {
                // Bust!
                this.trackCasinoGame(bet, 0);
                resultDiv.innerHTML = `💥 BUST! You lost ${GAME.formatNumber(bet)} coins!`;
                resultDiv.className = 'game-result lose';
            } else if (segment.mult >= 50) {
                // Big win!
                GAME.state.coins += winAmount;
                GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winAmount;
                this.trackCasinoGame(bet, winAmount);
                resultDiv.innerHTML = `🌟 ${segment.mult === 100 ? 'JACKPOT!' : 'HUGE WIN!'} ${segment.label}! Won ${GAME.formatNumber(winAmount)} coins!`;
                resultDiv.className = 'game-result win jackpot';
            } else {
                // Regular win
                GAME.state.coins += winAmount;
                GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winAmount;
                this.trackCasinoGame(bet, winAmount);
                resultDiv.innerHTML = `🎡 ${segment.label}! Won ${GAME.formatNumber(winAmount)} coins!`;
                resultDiv.className = 'game-result win';
            }
            
            this.updateCasinoStats();
            this.updateDisplay();
            GAME.saveGame();
        }, 5000);
    },

    // ==========================================
    // TEXAS HOLD'EM
    // ==========================================
    
    holdemState: {
        deck: [],
        playerCards: [],
        dealerCards: [],
        communityCards: [],
        phase: 'betting', // 'betting', 'preflop', 'flop', 'turn', 'river', 'showdown'
        pot: 0,
        ante: 0,
        playerBet: 0
    },

    /**
     * Setup Texas Hold'em
     */
    setupPoker() {
        const dealBtn = document.getElementById('holdemDealBtn');
        const callBtn = document.getElementById('holdemCallBtn');
        const raiseBtn = document.getElementById('holdemRaiseBtn');
        const foldBtn = document.getElementById('holdemFoldBtn');
        
        if (dealBtn) dealBtn.onclick = () => this.holdemDeal();
        if (callBtn) callBtn.onclick = () => this.holdemCall();
        if (raiseBtn) raiseBtn.onclick = () => this.holdemRaise();
        if (foldBtn) foldBtn.onclick = () => this.holdemFold();
        
        this.resetHoldem();
    },

    /**
     * Reset Hold'em to betting phase
     */
    resetHoldem() {
        this.holdemState.phase = 'betting';
        this.holdemState.pot = 0;
        this.holdemState.playerCards = [];
        this.holdemState.dealerCards = [];
        this.holdemState.communityCards = [];
        
        // Reset card displays
        for (let i = 0; i < 2; i++) {
            const playerCard = document.getElementById(`playerCard${i}`);
            const dealerCard = document.getElementById(`dealerCard${i}`);
            if (playerCard) playerCard.innerHTML = '<div class="card-back">🂠</div>';
            if (dealerCard) dealerCard.innerHTML = '<div class="card-back">🂠</div>';
            if (playerCard) playerCard.className = 'poker-card';
            if (dealerCard) dealerCard.className = 'poker-card';
        }
        for (let i = 0; i < 5; i++) {
            const commCard = document.getElementById(`commCard${i}`);
            if (commCard) {
                commCard.innerHTML = '<div class="card-back">🂠</div>';
                commCard.className = 'poker-card';
            }
        }
        
        // Show/hide buttons
        this.showHoldemButtons(['deal']);
        
        // Update pot display
        this.updatePotDisplay();
        
        const resultDiv = document.getElementById('pokerResult');
        if (resultDiv) {
            resultDiv.textContent = 'Place your ante and click DEAL';
            resultDiv.className = 'game-result';
        }
        
        this.clearPokerPaytableHighlight();
    },

    /**
     * Show specific Hold'em buttons
     */
    showHoldemButtons(buttons) {
        const dealBtn = document.getElementById('holdemDealBtn');
        const callBtn = document.getElementById('holdemCallBtn');
        const raiseBtn = document.getElementById('holdemRaiseBtn');
        const foldBtn = document.getElementById('holdemFoldBtn');
        
        if (dealBtn) dealBtn.style.display = buttons.includes('deal') ? 'inline-block' : 'none';
        if (callBtn) callBtn.style.display = buttons.includes('call') ? 'inline-block' : 'none';
        if (raiseBtn) raiseBtn.style.display = buttons.includes('raise') ? 'inline-block' : 'none';
        if (foldBtn) foldBtn.style.display = buttons.includes('fold') ? 'inline-block' : 'none';
    },

    /**
     * Update pot display
     */
    updatePotDisplay() {
        const potEl = document.getElementById('potAmount');
        if (potEl) potEl.textContent = GAME.formatNumber(this.holdemState.pot);
    },

    /**
     * Create a fresh shuffled deck
     */
    createPokerDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck = [];
        
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank });
            }
        }
        
        // Shuffle using Fisher-Yates
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        
        return deck;
    },

    /**
     * Deal initial cards
     */
    holdemDeal() {
        const ante = this.getBetValue('pokerBet');
        const resultDiv = document.getElementById('pokerResult');
        
        if (ante <= 0) {
            resultDiv.textContent = 'Enter a valid ante amount!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Need 4x ante for full game (ante + potential 3x raise)
        if (ante * 4 > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins! Need 4x ante to play.';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Deduct ante
        // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
        if (!this.processCasinoBet(ante)) {
            resultDiv.textContent = 'Bet processing failed!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        this.holdemState.ante = ante;
        this.holdemState.pot = ante * 2; // Dealer matches ante
        this.holdemState.playerBet = ante;
        this.holdemState.phase = 'preflop';
        
        // Create deck and deal
        this.holdemState.deck = this.createPokerDeck();
        this.holdemState.playerCards = [this.holdemState.deck.pop(), this.holdemState.deck.pop()];
        this.holdemState.dealerCards = [this.holdemState.deck.pop(), this.holdemState.deck.pop()];
        this.holdemState.communityCards = [];
        
        // Show player cards
        this.displayHoldemCards('player', this.holdemState.playerCards, true);
        
        // Show dealer cards face down
        this.displayHoldemCards('dealer', this.holdemState.dealerCards, false);
        
        this.updatePotDisplay();
        this.showHoldemButtons(['call', 'raise', 'fold']);
        
        resultDiv.textContent = 'Your cards dealt! CALL to see the flop, RAISE 2x, or FOLD';
        resultDiv.className = 'game-result';
        
        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * Display cards for a section
     */
    displayHoldemCards(section, cards, faceUp) {
        const prefix = section === 'player' ? 'playerCard' : section === 'dealer' ? 'dealerCard' : 'commCard';
        
        cards.forEach((card, i) => {
            const cardEl = document.getElementById(`${prefix}${i}`);
            if (cardEl) {
                if (faceUp) {
                    const isRed = card.suit === '♥' || card.suit === '♦';
                    cardEl.className = 'poker-card dealt';
                    cardEl.innerHTML = `
                        <div class="card-face ${isRed ? 'red' : 'black'}">
                            <span class="card-rank">${card.rank}</span>
                            <span class="card-suit">${card.suit}</span>
                        </div>
                    `;
                } else {
                    cardEl.className = 'poker-card';
                    cardEl.innerHTML = '<div class="card-back">🂠</div>';
                }
            }
        });
    },

    /**
     * Call - match bet and continue
     */
    holdemCall() {
        const resultDiv = document.getElementById('pokerResult');
        
        if (this.holdemState.phase === 'preflop') {
            // Deal the flop (3 community cards)
            for (let i = 0; i < 3; i++) {
                this.holdemState.communityCards.push(this.holdemState.deck.pop());
            }
            this.displayHoldemCards('comm', this.holdemState.communityCards, true);
            this.holdemState.phase = 'flop';
            resultDiv.textContent = 'Flop dealt! CALL to see the turn, RAISE 2x, or FOLD';
            
        } else if (this.holdemState.phase === 'flop') {
            // Deal the turn (4th community card)
            this.holdemState.communityCards.push(this.holdemState.deck.pop());
            this.displayHoldemCards('comm', this.holdemState.communityCards, true);
            this.holdemState.phase = 'turn';
            resultDiv.textContent = 'Turn dealt! CALL to see the river, RAISE 2x, or FOLD';
            
        } else if (this.holdemState.phase === 'turn') {
            // Deal the river (5th community card)
            this.holdemState.communityCards.push(this.holdemState.deck.pop());
            this.displayHoldemCards('comm', this.holdemState.communityCards, true);
            this.holdemState.phase = 'river';
            resultDiv.textContent = 'River dealt! CALL for showdown, RAISE 2x, or FOLD';
            
        } else if (this.holdemState.phase === 'river') {
            // Showdown!
            this.holdemShowdown();
        }
        
        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * Raise - bet 2x and continue
     */
    holdemRaise() {
        const raiseAmount = this.holdemState.ante * 2;
        
        if (raiseAmount > GAME.state.coins) {
            const resultDiv = document.getElementById('pokerResult');
            resultDiv.textContent = 'Not enough coins to raise!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Deduct raise
        // Process additional bet (deducts coins, adds to jackpot pool, gives VIP XP)
        if (!this.processCasinoBet(raiseAmount)) {
            const resultDiv = document.getElementById('pokerResult');
            resultDiv.textContent = 'Bet processing failed!';
            resultDiv.className = 'game-result lose';
            return;
        }
        this.holdemState.pot += raiseAmount * 2; // Dealer matches
        this.holdemState.playerBet += raiseAmount;
        
        this.updatePotDisplay();
        
        // Then continue as call
        this.holdemCall();
    },

    /**
     * Fold - forfeit the pot
     */
    holdemFold() {
        const resultDiv = document.getElementById('pokerResult');
        
        this.trackCasinoGame(this.holdemState.playerBet, 0);
        resultDiv.innerHTML = `❌ You folded. Lost ${GAME.formatNumber(this.holdemState.playerBet)} coins.`;
        resultDiv.className = 'game-result lose';
        
        this.holdemState.phase = 'betting';
        this.showHoldemButtons(['deal']);
        
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
        
        // Auto reset after delay
        setTimeout(() => this.resetHoldem(), 3000);
    },

    /**
     * Showdown - compare hands
     */
    holdemShowdown() {
        const resultDiv = document.getElementById('pokerResult');
        
        // Reveal dealer cards
        this.displayHoldemCards('dealer', this.holdemState.dealerCards, true);
        
        // Evaluate both hands (best 5 from 7 cards)
        const playerBest = this.getBestHoldemHand(this.holdemState.playerCards, this.holdemState.communityCards);
        const dealerBest = this.getBestHoldemHand(this.holdemState.dealerCards, this.holdemState.communityCards);
        
        const playerScore = this.getHandScore(playerBest);
        const dealerScore = this.getHandScore(dealerBest);
        
        this.holdemState.phase = 'showdown';
        this.showHoldemButtons(['deal']);
        
        // Highlight winning hand in paytable
        this.highlightPokerPaytable(playerBest.name);
        
        if (playerScore > dealerScore) {
            // Player wins!
            const multiplier = this.getHoldemMultiplier(playerBest.name);
            const winAmount = Math.floor(this.holdemState.pot * multiplier);
            GAME.state.coins += winAmount;
            GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winAmount;
            this.trackCasinoGame(this.holdemState.playerBet, winAmount);
            
            resultDiv.innerHTML = `🎉 You win with ${playerBest.name}! Won ${GAME.formatNumber(winAmount)} coins!`;
            resultDiv.className = 'game-result win' + (multiplier >= 10 ? ' jackpot' : '');
        } else if (dealerScore > playerScore) {
            // Dealer wins
            this.trackCasinoGame(this.holdemState.playerBet, 0);
            resultDiv.innerHTML = `😢 Dealer wins with ${dealerBest.name}. Lost ${GAME.formatNumber(this.holdemState.playerBet)} coins.`;
            resultDiv.className = 'game-result lose';
        } else {
            // Tie - return player's bet
            GAME.state.coins += this.holdemState.playerBet;
            this.trackCasinoGame(this.holdemState.playerBet, this.holdemState.playerBet); // Not a win, just returned
            resultDiv.innerHTML = `🤝 Push! Both have ${playerBest.name}. Bet returned.`;
            resultDiv.className = 'game-result';
        }
        
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
        
        // Auto reset after delay
        setTimeout(() => this.resetHoldem(), 4000);
    },

    /**
     * Get multiplier for Hold'em hand
     */
    getHoldemMultiplier(handName) {
        const multipliers = {
            'Royal Flush': 100,
            'Straight Flush': 20,
            'Four of a Kind': 10,
            'Full House': 3,
            'Flush': 2,
            'Straight': 1.5,
            'Three of a Kind': 1,
            'Two Pair': 1,
            'Pair': 1,
            'High Card': 1
        };
        return multipliers[handName] || 1;
    },

    /**
     * Get best 5-card hand from 7 cards
     */
    getBestHoldemHand(holeCards, communityCards) {
        const allCards = [...holeCards, ...communityCards];
        const combinations = this.getCombinations(allCards, 5);
        
        let bestHand = null;
        let bestScore = -1;
        
        for (const combo of combinations) {
            const result = this.evaluatePokerHand(combo);
            const score = this.getHandScore(result);
            if (score > bestScore) {
                bestScore = score;
                bestHand = result;
            }
        }
        
        return bestHand || { name: 'High Card', multiplier: 1, highCard: 0 };
    },

    /**
     * Get all combinations of k elements from array
     */
    getCombinations(arr, k) {
        const result = [];
        
        function combine(start, combo) {
            if (combo.length === k) {
                result.push([...combo]);
                return;
            }
            for (let i = start; i < arr.length; i++) {
                combo.push(arr[i]);
                combine(i + 1, combo);
                combo.pop();
            }
        }
        
        combine(0, []);
        return result;
    },

    /**
     * Get numeric score for hand comparison
     */
    getHandScore(hand) {
        if (!hand) return 0;
        
        const handRanks = {
            'Royal Flush': 10,
            'Straight Flush': 9,
            'Four of a Kind': 8,
            'Full House': 7,
            'Flush': 6,
            'Straight': 5,
            'Three of a Kind': 4,
            'Two Pair': 3,
            'Pair': 2,
            'High Card': 1
        };
        
        return (handRanks[hand.name] || 0) * 1000 + (hand.highCard || 0);
    },

    /**
     * Evaluate a poker hand and return the result
     */
    evaluatePokerHand(hand) {
        const rankValues = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        
        // Sort by rank value
        const sorted = [...hand].sort((a, b) => rankValues[a.rank] - rankValues[b.rank]);
        const values = sorted.map(c => rankValues[c.rank]);
        const suits = hand.map(c => c.suit);
        const highCard = Math.max(...values);
        
        // Count ranks
        const rankCounts = {};
        for (const card of hand) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }
        const counts = Object.values(rankCounts).sort((a, b) => b - a);
        
        // Check for flush
        const isFlush = suits.every(s => s === suits[0]);
        
        // Check for straight
        let isStraight = false;
        const uniqueValues = [...new Set(values)];
        if (uniqueValues.length === 5) {
            const range = values[4] - values[0];
            if (range === 4) {
                isStraight = true;
            }
            // Check for wheel (A-2-3-4-5)
            if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
                isStraight = true;
            }
        }
        
        // Royal Flush
        if (isFlush && isStraight && values[0] === 10) {
            return { name: 'Royal Flush', highCard };
        }
        
        // Straight Flush
        if (isFlush && isStraight) {
            return { name: 'Straight Flush', highCard };
        }
        
        // Four of a Kind
        if (counts[0] === 4) {
            return { name: 'Four of a Kind', highCard };
        }
        
        // Full House
        if (counts[0] === 3 && counts[1] === 2) {
            return { name: 'Full House', highCard };
        }
        
        // Flush
        if (isFlush) {
            return { name: 'Flush', highCard };
        }
        
        // Straight
        if (isStraight) {
            return { name: 'Straight', highCard };
        }
        
        // Three of a Kind
        if (counts[0] === 3) {
            return { name: 'Three of a Kind', highCard };
        }
        
        // Two Pair
        if (counts[0] === 2 && counts[1] === 2) {
            return { name: 'Two Pair', highCard };
        }
        
        // Pair
        if (counts[0] === 2) {
            return { name: 'Pair', highCard };
        }
        
        return { name: 'High Card', highCard };
    },

    /**
     * Highlight a specific hand in the paytable
     */
    highlightPokerPaytable(handName) {
        const rows = document.querySelectorAll('.poker-paytable .paytable-row');
        rows.forEach(row => {
            const nameEl = row.querySelector('.hand-name');
            if (nameEl && nameEl.textContent === handName) {
                nameEl.classList.add('winning');
            }
        });
    },

    /**
     * Clear paytable highlighting
     */
    clearPokerPaytableHighlight() {
        const rows = document.querySelectorAll('.poker-paytable .hand-name');
        rows.forEach(el => el.classList.remove('winning'));
    },

    // ==========================================
    // PLINKO
    // ==========================================

    plinkoState: {
        risk: 'low',
        dropping: false,
        balls: [],
        pegs: [],
        slots: []
    },

    plinkoMultipliers: {
        low: [1.5, 1.2, 1.1, 1, 0.5, 0.3, 0.5, 1, 1.1, 1.2, 1.5],
        medium: [3, 1.5, 1.2, 0.8, 0.5, 0, 0.5, 0.8, 1.2, 1.5, 3],
        high: [10, 3, 1.5, 0.5, 0.2, 0, 0.2, 0.5, 1.5, 3, 10]
    },

    /**
     * Setup Plinko game
     */
    setupPlinko() {
        const dropBtn = document.getElementById('plinkoDropBtn');
        if (dropBtn) {
            dropBtn.onclick = () => this.dropPlinkoBall();
        }

        // Risk button handlers
        document.querySelectorAll('.risk-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.plinkoState.risk = btn.dataset.risk;
                this.renderPlinkoSlots();
            });
        });

        // Initialize the plinko board
        this.initPlinkoBoard();
        this.renderPlinkoSlots();
    },

    /**
     * Initialize plinko board pegs
     */
    initPlinkoBoard() {
        const canvas = document.getElementById('plinkoCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Create pegs
        this.plinkoState.pegs = [];
        const rows = 10;
        const pegRadius = 5;
        const startY = 60;
        const rowHeight = (height - 120) / rows;
        
        for (let row = 0; row < rows; row++) {
            const pegsInRow = row + 3;
            const rowWidth = (pegsInRow - 1) * 35;
            const startX = (width - rowWidth) / 2;
            
            for (let col = 0; col < pegsInRow; col++) {
                this.plinkoState.pegs.push({
                    x: startX + col * 35,
                    y: startY + row * rowHeight,
                    radius: pegRadius
                });
            }
        }

        // Draw initial board
        this.drawPlinkoBoard();
    },

    /**
     * Draw the plinko board
     */
    drawPlinkoBoard() {
        const canvas = document.getElementById('plinkoCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw pegs
        this.plinkoState.pegs.forEach(peg => {
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#e0e0e0';
            ctx.fill();
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Draw drop zone indicator
        ctx.beginPath();
        ctx.moveTo(width / 2 - 30, 15);
        ctx.lineTo(width / 2, 35);
        ctx.lineTo(width / 2 + 30, 15);
        ctx.strokeStyle = '#a569bd';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw active balls
        this.plinkoState.balls.forEach(ball => {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            const ballGradient = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 0, ball.x, ball.y, ball.radius);
            ballGradient.addColorStop(0, '#ffd700');
            ballGradient.addColorStop(1, '#ff8c00');
            ctx.fillStyle = ballGradient;
            ctx.fill();
            ctx.strokeStyle = '#cc7000';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    },

    /**
     * Render plinko prize slots
     */
    renderPlinkoSlots() {
        const container = document.getElementById('plinkoSlots');
        if (!container) return;

        const multipliers = this.plinkoMultipliers[this.plinkoState.risk];
        container.innerHTML = '';

        multipliers.forEach((mult, i) => {
            const slot = document.createElement('div');
            slot.className = 'plinko-slot';
            slot.dataset.index = i;
            
            if (mult === 0) {
                slot.classList.add('mult-0');
                slot.textContent = '0x';
            } else if (mult >= 5) {
                slot.classList.add('mult-jackpot');
                slot.textContent = mult + 'x';
            } else if (mult >= 2) {
                slot.classList.add('mult-high');
                slot.textContent = mult + 'x';
            } else if (mult >= 1) {
                slot.classList.add('mult-med');
                slot.textContent = mult + 'x';
            } else {
                slot.classList.add('mult-low');
                slot.textContent = mult + 'x';
            }
            
            container.appendChild(slot);
        });
    },

    /**
     * Drop a plinko ball
     */
    dropPlinkoBall() {
        if (this.plinkoState.dropping) return;

        const bet = this.getBetValue('plinkoBet');
        const resultDiv = document.getElementById('pokerResult');
        const dropBtn = document.getElementById('plinkoDropBtn');
        const plinkoResultDiv = document.getElementById('plinkoResult');

        if (bet <= 0) {
            plinkoResultDiv.textContent = 'Enter a valid bet amount!';
            plinkoResultDiv.className = 'game-result lose';
            return;
        }

        if (bet > GAME.state.coins) {
            plinkoResultDiv.textContent = 'Not enough coins!';
            plinkoResultDiv.className = 'game-result lose';
            return;
        }

        // Deduct bet
        // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
        if (!this.processCasinoBet(bet)) {
            plinkoResultDiv.textContent = 'Bet processing failed!';
            plinkoResultDiv.className = 'game-result lose';
            return;
        }

        this.plinkoState.dropping = true;
        dropBtn.disabled = true;
        plinkoResultDiv.textContent = '🎯 Ball dropping...';
        plinkoResultDiv.className = 'game-result';

        // Create ball with slight random horizontal offset
        const canvas = document.getElementById('plinkoCanvas');
        const ball = {
            x: canvas.width / 2 + (Math.random() - 0.5) * 20,
            y: 25,
            vx: 0,
            vy: 0,
            radius: 10,
            bet: bet
        };

        this.plinkoState.balls.push(ball);
        this.animatePlinkoBall(ball);
        
        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * Animate a plinko ball falling
     */
    animatePlinkoBall(ball) {
        const canvas = document.getElementById('plinkoCanvas');
        const gravity = 0.3;
        const friction = 0.98;
        const bounce = 0.7;

        const animate = () => {
            // Apply gravity
            ball.vy += gravity;
            ball.vx *= friction;

            // Move ball
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Check peg collisions
            this.plinkoState.pegs.forEach(peg => {
                const dx = ball.x - peg.x;
                const dy = ball.y - peg.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDist = ball.radius + peg.radius;

                if (distance < minDist) {
                    // Collision! Bounce off
                    const angle = Math.atan2(dy, dx);
                    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                    
                    // Add randomness to bounce direction
                    const randomAngle = angle + (Math.random() - 0.5) * 0.5;
                    ball.vx = Math.cos(randomAngle) * speed * bounce;
                    ball.vy = Math.abs(Math.sin(randomAngle) * speed * bounce);
                    
                    // Push ball out of peg
                    ball.x = peg.x + Math.cos(angle) * minDist;
                    ball.y = peg.y + Math.sin(angle) * minDist;
                }
            });

            // Wall collisions
            if (ball.x < ball.radius) {
                ball.x = ball.radius;
                ball.vx = Math.abs(ball.vx) * bounce;
            }
            if (ball.x > canvas.width - ball.radius) {
                ball.x = canvas.width - ball.radius;
                ball.vx = -Math.abs(ball.vx) * bounce;
            }

            // Redraw
            this.drawPlinkoBoard();

            // Check if ball reached bottom
            if (ball.y >= canvas.height - 20) {
                // Determine which slot the ball landed in
                this.plinkoLanded(ball);
                return;
            }

            requestAnimationFrame(animate);
        };

        animate();
    },

    /**
     * Handle ball landing in a slot
     */
    plinkoLanded(ball) {
        const canvas = document.getElementById('plinkoCanvas');
        const multipliers = this.plinkoMultipliers[this.plinkoState.risk];
        const slotCount = multipliers.length;
        const slotWidth = canvas.width / slotCount;
        
        // Determine slot index
        let slotIndex = Math.floor(ball.x / slotWidth);
        slotIndex = Math.max(0, Math.min(slotCount - 1, slotIndex));
        
        const multiplier = multipliers[slotIndex];
        const winAmount = Math.floor(ball.bet * multiplier);

        // Remove ball
        const ballIndex = this.plinkoState.balls.indexOf(ball);
        if (ballIndex > -1) {
            this.plinkoState.balls.splice(ballIndex, 1);
        }

        // Highlight winning slot
        const slots = document.querySelectorAll('.plinko-slot');
        slots.forEach(s => s.classList.remove('winning'));
        if (slots[slotIndex]) {
            slots[slotIndex].classList.add('winning');
        }

        const plinkoResultDiv = document.getElementById('plinkoResult');
        const dropBtn = document.getElementById('plinkoDropBtn');

        if (multiplier === 0) {
            this.trackCasinoGame(ball.bet, 0);
            plinkoResultDiv.innerHTML = `💥 Ball fell in 0x! Lost ${GAME.formatNumber(ball.bet)} coins!`;
            plinkoResultDiv.className = 'game-result lose';
        } else if (winAmount > ball.bet) {
            GAME.state.coins += winAmount;
            GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winAmount;
            this.trackCasinoGame(ball.bet, winAmount);
            plinkoResultDiv.innerHTML = `🎯 ${multiplier}x! Won ${GAME.formatNumber(winAmount)} coins!`;
            plinkoResultDiv.className = 'game-result win' + (multiplier >= 5 ? ' jackpot' : '');
        } else {
            GAME.state.coins += winAmount;
            GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winAmount;
            this.trackCasinoGame(ball.bet, winAmount);
            plinkoResultDiv.innerHTML = `🎯 ${multiplier}x - Got back ${GAME.formatNumber(winAmount)} coins`;
            plinkoResultDiv.className = 'game-result';
        }

        this.plinkoState.dropping = false;
        dropBtn.disabled = false;

        this.drawPlinkoBoard();
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();

        // Clear slot highlight after delay
        setTimeout(() => {
            slots.forEach(s => s.classList.remove('winning'));
        }, 2000);
    },

    // ==========================================
    // MINES
    // ==========================================

    minesState: {
        active: false,
        grid: [], // 25 tiles (5x5)
        minePositions: [],
        revealed: [],
        mineCount: 5,
        bet: 0,
        gemsFound: 0,
        multiplier: 1
    },

    /**
     * Setup Mines game
     */
    setupMines() {
        const startBtn = document.getElementById('minesStartBtn');
        const cashoutBtn = document.getElementById('minesCashoutBtn');

        if (startBtn) {
            startBtn.onclick = () => this.startMinesGame();
        }

        if (cashoutBtn) {
            cashoutBtn.onclick = () => this.minesCashout();
        }

        // Mine count button handlers
        document.querySelectorAll('.mines-count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.minesState.active) return;
                document.querySelectorAll('.mines-count-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.minesState.mineCount = parseInt(btn.dataset.mines);
            });
        });
    },

    /**
     * Calculate multiplier for mines based on gems found
     */
    calculateMinesMultiplier(gemsFound, mineCount) {
        const totalTiles = 25;
        const safeTiles = totalTiles - mineCount;
        
        if (gemsFound === 0) return 1;
        
        // Calculate probability-based multiplier
        // House edge of ~3%
        let multiplier = 1;
        for (let i = 0; i < gemsFound; i++) {
            const remaining = safeTiles - i;
            const total = totalTiles - i;
            multiplier *= (total / remaining) * 0.97;
        }
        
        return Math.max(1, multiplier);
    },

    /**
     * Start a new mines game
     */
    startMinesGame() {
        const bet = this.getBetValue('minesBet');
        const resultDiv = document.getElementById('minesResult');

        if (bet <= 0) {
            resultDiv.textContent = 'Enter a valid bet amount!';
            resultDiv.className = 'game-result lose';
            return;
        }

        if (bet > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins!';
            resultDiv.className = 'game-result lose';
            return;
        }

        // Deduct bet
        // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
        if (!this.processCasinoBet(bet)) {
            resultDiv.textContent = 'Bet processing failed!';
            resultDiv.className = 'game-result lose';
            return;
        }

        // Initialize game state
        this.minesState.active = true;
        this.minesState.bet = bet;
        this.minesState.gemsFound = 0;
        this.minesState.multiplier = 1;
        this.minesState.revealed = Array(25).fill(false);

        // Place mines randomly
        this.minesState.minePositions = [];
        while (this.minesState.minePositions.length < this.minesState.mineCount) {
            const pos = Math.floor(Math.random() * 25);
            if (!this.minesState.minePositions.includes(pos)) {
                this.minesState.minePositions.push(pos);
            }
        }

        // Create grid
        this.minesState.grid = Array(25).fill('gem');
        this.minesState.minePositions.forEach(pos => {
            this.minesState.grid[pos] = 'mine';
        });

        // Show game area, hide setup
        document.getElementById('minesSetup').style.display = 'none';
        document.getElementById('minesGameArea').style.display = 'block';

        // Render grid
        this.renderMinesGrid();
        this.updateMinesInfo();

        resultDiv.textContent = 'Click tiles to reveal gems! Cash out anytime!';
        resultDiv.className = 'game-result';

        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * Render the mines grid
     */
    renderMinesGrid() {
        const grid = document.getElementById('minesGrid');
        if (!grid) return;

        grid.innerHTML = '';

        for (let i = 0; i < 25; i++) {
            const tile = document.createElement('div');
            tile.className = 'mines-tile';
            tile.dataset.index = i;

            if (this.minesState.revealed[i]) {
                tile.classList.add('revealed');
                if (this.minesState.grid[i] === 'gem') {
                    tile.classList.add('gem');
                    tile.textContent = '💎';
                } else {
                    tile.classList.add('mine');
                    tile.textContent = '💣';
                }
            } else {
                tile.textContent = '?';
                if (this.minesState.active) {
                    tile.onclick = () => this.revealMinesTile(i);
                }
            }

            grid.appendChild(tile);
        }
    },

    /**
     * Update mines info display
     */
    updateMinesInfo() {
        const multiplierEl = document.getElementById('minesMultiplier');
        const potentialEl = document.getElementById('minesPotential');
        const gemsEl = document.getElementById('minesGemsFound');

        const safeTiles = 25 - this.minesState.mineCount;
        const nextMultiplier = this.calculateMinesMultiplier(this.minesState.gemsFound + 1, this.minesState.mineCount);

        if (multiplierEl) {
            multiplierEl.textContent = this.minesState.multiplier.toFixed(2) + 'x';
        }

        if (potentialEl) {
            const potential = Math.floor(this.minesState.bet * this.minesState.multiplier);
            potentialEl.textContent = GAME.formatNumber(potential);
        }

        if (gemsEl) {
            gemsEl.textContent = `${this.minesState.gemsFound} / ${safeTiles}`;
        }
    },

    /**
     * Reveal a mines tile
     */
    revealMinesTile(index) {
        if (!this.minesState.active || this.minesState.revealed[index]) return;

        this.minesState.revealed[index] = true;
        const tile = this.minesState.grid[index];
        const resultDiv = document.getElementById('minesResult');

        if (tile === 'mine') {
            // Hit a mine! Game over
            this.minesState.active = false;

            // Reveal all mines
            this.minesState.minePositions.forEach(pos => {
                this.minesState.revealed[pos] = true;
            });

            this.renderMinesGrid();

            // Mark unrevealed tiles
            document.querySelectorAll('.mines-tile:not(.revealed)').forEach(t => {
                t.classList.add('revealed-end');
            });

            resultDiv.innerHTML = `💥 BOOM! Hit a mine! Lost ${GAME.formatNumber(this.minesState.bet)} coins!`;
            resultDiv.className = 'game-result lose';
            
            this.trackCasinoGame(this.minesState.bet, 0);

            // Show setup again after delay
            setTimeout(() => this.resetMinesGame(), 2500);

        } else {
            // Found a gem!
            this.minesState.gemsFound++;
            this.minesState.multiplier = this.calculateMinesMultiplier(this.minesState.gemsFound, this.minesState.mineCount);

            this.renderMinesGrid();
            this.updateMinesInfo();

            const safeTiles = 25 - this.minesState.mineCount;

            if (this.minesState.gemsFound >= safeTiles) {
                // Found all gems! Auto cashout
                this.minesCashout();
            } else {
                const potential = Math.floor(this.minesState.bet * this.minesState.multiplier);
                resultDiv.innerHTML = `💎 Gem found! ${this.minesState.multiplier.toFixed(2)}x - Worth ${GAME.formatNumber(potential)} coins!`;
                resultDiv.className = 'game-result win';
            }
        }

        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * Cash out mines winnings
     */
    minesCashout() {
        if (!this.minesState.active || this.minesState.gemsFound === 0) return;

        const winAmount = Math.floor(this.minesState.bet * this.minesState.multiplier);
        GAME.state.coins += winAmount;
        GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winAmount;
        this.trackCasinoGame(this.minesState.bet, winAmount);

        const resultDiv = document.getElementById('minesResult');
        const safeTiles = 25 - this.minesState.mineCount;

        if (this.minesState.gemsFound >= safeTiles) {
            resultDiv.innerHTML = `🌟 PERFECT! Found all ${safeTiles} gems! Won ${GAME.formatNumber(winAmount)} coins!`;
            resultDiv.className = 'game-result win jackpot';
        } else {
            resultDiv.innerHTML = `💰 Cashed out! ${this.minesState.multiplier.toFixed(2)}x - Won ${GAME.formatNumber(winAmount)} coins!`;
            resultDiv.className = 'game-result win';
        }

        this.minesState.active = false;

        // Reveal all mines
        this.minesState.minePositions.forEach(pos => {
            this.minesState.revealed[pos] = true;
        });
        this.renderMinesGrid();

        document.querySelectorAll('.mines-tile:not(.revealed)').forEach(t => {
            t.classList.add('revealed-end');
        });

        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();

        // Reset after delay
        setTimeout(() => this.resetMinesGame(), 2500);
    },

    /**
     * Reset mines game to setup
     */
    resetMinesGame() {
        this.minesState.active = false;
        document.getElementById('minesSetup').style.display = 'block';
        document.getElementById('minesGameArea').style.display = 'none';

        const resultDiv = document.getElementById('minesResult');
        resultDiv.textContent = 'Select mines count and start the game!';
        resultDiv.className = 'game-result';
    },

    // ==========================================
    // CRASH
    // ==========================================

    crashState: {
        phase: 'waiting', // 'waiting', 'betting', 'running', 'crashed'
        multiplier: 1.00,
        crashPoint: 1.00,
        bet: 0,
        autoCashout: 2.00,
        hasBet: false,
        cashedOut: false,
        history: [],
        animationId: null,
        graphPoints: []
    },

    /**
     * Setup Crash game
     */
    setupCrash() {
        const betBtn = document.getElementById('crashBetBtn');
        const cashoutBtn = document.getElementById('crashCashoutBtn');

        if (betBtn) {
            betBtn.onclick = () => this.crashPlaceBet();
        }

        if (cashoutBtn) {
            cashoutBtn.onclick = () => this.crashCashout();
        }

        // Initialize crash game loop
        this.initCrashGame();
    },

    /**
     * Initialize crash game and start the loop
     */
    initCrashGame() {
        this.drawCrashGraph();
        this.updateCrashHistory();
        
        // Start a new round after a delay
        setTimeout(() => this.startCrashRound(), 2000);
    },

    /**
     * Generate a crash point using a provably fair algorithm
     */
    generateCrashPoint() {
        // House edge of ~4%
        const houseEdge = 0.04;
        const random = Math.random();
        
        // Exponential distribution for crash point
        // Lower values are more likely
        if (random < houseEdge) {
            return 1.00; // Instant crash
        }
        
        // Calculate crash point
        const crashPoint = 1 / (1 - random * (1 - houseEdge));
        return Math.max(1.00, Math.floor(crashPoint * 100) / 100);
    },

    /**
     * Start a new crash round
     */
    startCrashRound() {
        this.crashState.phase = 'betting';
        this.crashState.multiplier = 1.00;
        this.crashState.crashPoint = this.generateCrashPoint();
        this.crashState.hasBet = false;
        this.crashState.cashedOut = false;
        this.crashState.graphPoints = [{x: 0, y: 1}];

        const betBtn = document.getElementById('crashBetBtn');
        const cashoutBtn = document.getElementById('crashCashoutBtn');
        const multiplierEl = document.getElementById('crashMultiplier');
        const resultDiv = document.getElementById('crashResult');

        betBtn.style.display = 'inline-block';
        betBtn.disabled = false;
        betBtn.textContent = '🚀 PLACE BET';
        betBtn.classList.remove('waiting');
        cashoutBtn.style.display = 'none';

        multiplierEl.textContent = '1.00x';
        multiplierEl.className = 'crash-multiplier';

        resultDiv.textContent = 'Place your bet before the rocket launches!';
        resultDiv.className = 'game-result';

        this.drawCrashGraph();

        // Betting phase lasts 5 seconds
        let countdown = 5;
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                resultDiv.textContent = `Launching in ${countdown}... Place your bets!`;
            } else {
                clearInterval(countdownInterval);
                this.runCrashRound();
            }
        }, 1000);
    },

    /**
     * Run the crash round
     */
    runCrashRound() {
        this.crashState.phase = 'running';
        
        const betBtn = document.getElementById('crashBetBtn');
        const cashoutBtn = document.getElementById('crashCashoutBtn');
        const resultDiv = document.getElementById('crashResult');

        betBtn.disabled = true;
        betBtn.textContent = '🚀 LAUNCHING...';

        if (this.crashState.hasBet && !this.crashState.cashedOut) {
            cashoutBtn.style.display = 'inline-block';
        }

        resultDiv.textContent = '🚀 TO THE MOON!';
        resultDiv.className = 'game-result';

        const startTime = Date.now();
        const crashPoint = this.crashState.crashPoint;

        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            
            // Multiplier increases exponentially
            // Speed increases as multiplier gets higher
            const multiplier = Math.pow(Math.E, elapsed * 0.15);
            this.crashState.multiplier = Math.floor(multiplier * 100) / 100;

            // Add point to graph
            this.crashState.graphPoints.push({
                x: elapsed,
                y: this.crashState.multiplier
            });

            this.updateCrashDisplay();
            this.drawCrashGraph();

            // Check auto cashout
            if (this.crashState.hasBet && !this.crashState.cashedOut) {
                const autoCashout = parseFloat(document.getElementById('crashAutoCashout').value) || 0;
                if (autoCashout > 0 && this.crashState.multiplier >= autoCashout) {
                    this.crashCashout();
                }
            }

            // Check if crashed
            if (this.crashState.multiplier >= crashPoint) {
                this.crashRoundEnd();
                return;
            }

            this.crashState.animationId = requestAnimationFrame(animate);
        };

        animate();
    },

    /**
     * Update crash display
     */
    updateCrashDisplay() {
        const multiplierEl = document.getElementById('crashMultiplier');
        multiplierEl.textContent = this.crashState.multiplier.toFixed(2) + 'x';
    },

    /**
     * Draw crash graph
     */
    drawCrashGraph() {
        const canvas = document.getElementById('crashCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#1a2a3a';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 5; i++) {
            const y = height - (i * height / 5);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw multiplier line
        if (this.crashState.graphPoints.length > 1) {
            const maxTime = Math.max(10, this.crashState.graphPoints[this.crashState.graphPoints.length - 1].x);
            const maxMult = Math.max(2, this.crashState.multiplier);

            ctx.strokeStyle = this.crashState.phase === 'crashed' ? '#e74c3c' : '#2ecc71';
            ctx.lineWidth = 3;
            ctx.beginPath();

            this.crashState.graphPoints.forEach((point, i) => {
                const x = (point.x / maxTime) * width;
                const y = height - ((point.y - 1) / (maxMult - 1)) * (height - 20);
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // Draw rocket emoji at end of line
            if (this.crashState.phase === 'running') {
                const lastPoint = this.crashState.graphPoints[this.crashState.graphPoints.length - 1];
                const x = (lastPoint.x / maxTime) * width;
                const y = height - ((lastPoint.y - 1) / (maxMult - 1)) * (height - 20);
                ctx.font = '20px Arial';
                ctx.fillText('🚀', x - 10, y - 10);
            }
        }
    },

    /**
     * Place a bet
     */
    crashPlaceBet() {
        if (this.crashState.phase !== 'betting') return;

        const bet = this.getBetValue('crashBet');
        const resultDiv = document.getElementById('crashResult');
        const betBtn = document.getElementById('crashBetBtn');

        if (bet <= 0) {
            resultDiv.textContent = 'Enter a valid bet amount!';
            resultDiv.className = 'game-result lose';
            return;
        }

        if (bet > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins!';
            resultDiv.className = 'game-result lose';
            return;
        }

        // Deduct bet
        // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
        if (!this.processCasinoBet(bet)) {
            resultDiv.textContent = 'Bet processing failed!';
            resultDiv.className = 'game-result lose';
            return;
        }

        this.crashState.bet = bet;
        this.crashState.hasBet = true;
        this.crashState.autoCashout = parseFloat(document.getElementById('crashAutoCashout').value) || 0;

        betBtn.textContent = '✓ BET PLACED';
        betBtn.classList.add('waiting');
        betBtn.disabled = true;

        resultDiv.textContent = `Bet of ${GAME.formatNumber(bet)} placed! Waiting for launch...`;
        resultDiv.className = 'game-result';

        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * Cash out
     */
    crashCashout() {
        if (!this.crashState.hasBet || this.crashState.cashedOut || this.crashState.phase !== 'running') return;

        this.crashState.cashedOut = true;
        const winAmount = Math.floor(this.crashState.bet * this.crashState.multiplier);

        GAME.state.coins += winAmount;
        GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + winAmount;
        this.trackCasinoGame(this.crashState.bet, winAmount);

        const cashoutBtn = document.getElementById('crashCashoutBtn');
        const multiplierEl = document.getElementById('crashMultiplier');
        const resultDiv = document.getElementById('crashResult');

        cashoutBtn.style.display = 'none';
        multiplierEl.classList.add('cashed');

        resultDiv.innerHTML = `💰 Cashed out at ${this.crashState.multiplier.toFixed(2)}x! Won ${GAME.formatNumber(winAmount)} coins!`;
        resultDiv.className = 'game-result win';

        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * End the crash round
     */
    crashRoundEnd() {
        if (this.crashState.animationId) {
            cancelAnimationFrame(this.crashState.animationId);
        }

        this.crashState.phase = 'crashed';

        const multiplierEl = document.getElementById('crashMultiplier');
        const cashoutBtn = document.getElementById('crashCashoutBtn');
        const resultDiv = document.getElementById('crashResult');
        const betBtn = document.getElementById('crashBetBtn');

        multiplierEl.textContent = this.crashState.crashPoint.toFixed(2) + 'x';
        multiplierEl.classList.add('crashed');
        cashoutBtn.style.display = 'none';
        betBtn.style.display = 'none';

        // Add to history
        this.crashState.history.unshift(this.crashState.crashPoint);
        if (this.crashState.history.length > 10) {
            this.crashState.history.pop();
        }
        this.updateCrashHistory();

        // Handle player who didn't cash out
        if (this.crashState.hasBet && !this.crashState.cashedOut) {
            this.trackCasinoGame(this.crashState.bet, 0);
            resultDiv.innerHTML = `💥 CRASHED at ${this.crashState.crashPoint.toFixed(2)}x! Lost ${GAME.formatNumber(this.crashState.bet)} coins!`;
            resultDiv.className = 'game-result lose';
        } else if (!this.crashState.hasBet) {
            resultDiv.innerHTML = `💥 Crashed at ${this.crashState.crashPoint.toFixed(2)}x`;
            resultDiv.className = 'game-result';
        }

        this.drawCrashGraph();
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();

        // Start next round
        setTimeout(() => this.startCrashRound(), 3000);
    },

    /**
     * Update crash history display
     */
    updateCrashHistory() {
        const container = document.getElementById('crashHistory');
        if (!container) return;

        container.innerHTML = '';

        this.crashState.history.forEach(point => {
            const item = document.createElement('span');
            item.className = 'crash-history-item';
            item.textContent = point.toFixed(2) + 'x';

            if (point < 1.5) {
                item.classList.add('low');
            } else if (point < 3) {
                item.classList.add('med');
            } else if (point < 10) {
                item.classList.add('high');
            } else {
                item.classList.add('mega');
            }

            container.appendChild(item);
        });
    },

    // ==================== DRAGON'S LAIR SLOT ====================
    
    dragonState: {
        currentBet: 0,
        multiplier: 1,
        freeSpins: 0,
        fireMultiplier: 1,
        spinning: false,
        grid: [],
        fireDragons: [] // Positions of dragons that breathe fire
    },

    // Dragon slot symbols with weights and payouts
    dragonSymbols: [
        { symbol: '🐉', name: 'Dragon', weight: 5, payouts: { 3: 10, 4: 25, 5: 100 }, isWild: true },
        { symbol: '💎', name: 'Gem', weight: 10, payouts: { 3: 5, 4: 15, 5: 75 } },
        { symbol: '🏰', name: 'Castle', weight: 15, payouts: { 3: 2, 4: 6, 5: 30 } },
        { symbol: '⚔️', name: 'Sword', weight: 20, payouts: { 3: 1.5, 4: 4, 5: 20 } },
        { symbol: '🔥', name: 'Fire', weight: 25, payouts: { 3: 1, 4: 3, 5: 15 } },
        { symbol: '🥚', name: 'Egg', weight: 8, payouts: { 3: 0, 4: 0, 5: 0 }, isScatter: true }
    ],

    // 20 paylines (same as Midas)
    dragonPaylines: [
        [[0,0], [1,0], [2,0], [3,0], [4,0]], // Top row
        [[0,1], [1,1], [2,1], [3,1], [4,1]], // Middle row
        [[0,2], [1,2], [2,2], [3,2], [4,2]], // Bottom row
        [[0,0], [1,1], [2,2], [3,1], [4,0]], // V shape
        [[0,2], [1,1], [2,0], [3,1], [4,2]], // Inverted V
        [[0,0], [1,0], [2,1], [3,2], [4,2]], // Diagonal down
        [[0,2], [1,2], [2,1], [3,0], [4,0]], // Diagonal up
        [[0,1], [1,0], [2,0], [3,0], [4,1]], // Slight top curve
        [[0,1], [1,2], [2,2], [3,2], [4,1]], // Slight bottom curve
        [[0,0], [1,1], [2,0], [3,1], [4,0]], // Zigzag top
        [[0,2], [1,1], [2,2], [3,1], [4,2]], // Zigzag bottom
        [[0,1], [1,0], [2,1], [3,2], [4,1]], // Wave up
        [[0,1], [1,2], [2,1], [3,0], [4,1]], // Wave down
        [[0,0], [1,2], [2,0], [3,2], [4,0]], // Big zigzag
        [[0,2], [1,0], [2,2], [3,0], [4,2]], // Big zigzag reverse
        [[0,0], [1,0], [2,0], [3,1], [4,2]], // Top to bottom
        [[0,2], [1,2], [2,2], [3,1], [4,0]], // Bottom to top
        [[0,1], [1,1], [2,0], [3,1], [4,1]], // Middle dip up
        [[0,1], [1,1], [2,2], [3,1], [4,1]], // Middle dip down
        [[0,0], [1,1], [2,1], [3,1], [4,2]]  // Gentle diagonal
    ],

    setupDragon() {
        const spinBtn = document.getElementById('spinDragon');
        spinBtn.onclick = () => this.spinDragon(false);
        
        const fireSpinBtn = document.getElementById('fireSpinDragon');
        fireSpinBtn.onclick = () => this.spinDragon(true);
        
        this.updateDragonSpinCost();
    },

    updateDragonSpinCost() {
        const costSpan = document.getElementById('fireSpinCost');
        if (costSpan) {
            const bet = this.getBetValue('dragonBet') || 10;
            costSpan.textContent = GAME.formatNumber(bet * 100);
        }
    },

    /**
     * Spin with max affordable dragon rage bet
     */
    spinMaxDragonRage() {
        const maxBet = Math.floor(GAME.state.coins / 100);
        
        if (maxBet < 1) {
            const resultDiv = document.getElementById('dragonResult');
            resultDiv.textContent = 'Not enough coins for Dragon Rage! Need at least 100 coins.';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        const betInput = document.getElementById('dragonBet');
        if (betInput) {
            betInput.dataset.rawValue = this.numberToFullString(maxBet);
            betInput.value = this.formatBetDisplay(maxBet);
        }
        
        this.updateDragonSpinCost();
        this.spinDragon(true);
    },

    getRandomDragonSymbol() {
        const totalWeight = this.dragonSymbols.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const symbolData of this.dragonSymbols) {
            random -= symbolData.weight;
            if (random <= 0) return symbolData.symbol;
        }
        return this.dragonSymbols[0].symbol;
    },

    spinDragon(isFireSpin = false) {
        if (this.dragonState.spinning) return;
        
        const bet = this.getBetValue('dragonBet');
        const resultDiv = document.getElementById('dragonResult');
        const spinBtn = document.getElementById('spinDragon');
        const fireSpinBtn = document.getElementById('fireSpinDragon');
        
        // Calculate cost
        const cost = isFireSpin ? bet * 100 : (this.dragonState.freeSpins > 0 ? 0 : bet);
        
        if (cost > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Deduct cost
        if (cost > 0) {
            // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
            // For fire spins, we handle the cost manually since it's 100x bet
            if (!isFireSpin) {
                if (!this.processCasinoBet(bet)) {
                    resultDiv.textContent = 'Bet processing failed!';
                    resultDiv.className = 'game-result lose';
                    return;
                }
            } else {
                GAME.state.coins -= cost;
                GAME.state.casinoTotalWagered = (GAME.state.casinoTotalWagered || 0) + bet;
                GAME.state.casinoGamesPlayed = (GAME.state.casinoGamesPlayed || 0) + 1;
            }
        }
        
        this.dragonState.spinning = true;
        this.dragonState.currentBet = bet;
        spinBtn.disabled = true;
        fireSpinBtn.disabled = true;
        resultDiv.textContent = '🐉 Awakening the dragon...';
        resultDiv.className = 'game-result';
        
        // Generate grid
        this.dragonState.grid = [];
        for (let reel = 0; reel < 5; reel++) {
            this.dragonState.grid[reel] = [];
            for (let row = 0; row < 3; row++) {
                if (isFireSpin) {
                    // Guarantee 3-5 dragons
                    const dragonPositions = this.generateDragonPositions();
                    if (dragonPositions.some(p => p[0] === reel && p[1] === row)) {
                        this.dragonState.grid[reel][row] = '🐉';
                    } else {
                        this.dragonState.grid[reel][row] = this.getRandomDragonSymbol();
                    }
                } else {
                    this.dragonState.grid[reel][row] = this.getRandomDragonSymbol();
                }
            }
        }
        
        // If fire spin, ensure minimum dragons
        if (isFireSpin) {
            this.ensureMinDragons(3 + Math.floor(Math.random() * 3)); // 3-5 dragons
        }
        
        // Animate reels
        const reels = [];
        for (let i = 1; i <= 5; i++) {
            reels.push(document.getElementById(`dragonReel${i}`));
        }
        
        reels.forEach(reel => {
            reel.querySelectorAll('.dragon-symbol').forEach(sym => sym.classList.add('spinning'));
        });
        
        this.stopDragonReelsSequentially(reels, bet);
    },

    generateDragonPositions() {
        const positions = [];
        const count = 3 + Math.floor(Math.random() * 3);
        while (positions.length < count) {
            const pos = [Math.floor(Math.random() * 5), Math.floor(Math.random() * 3)];
            if (!positions.some(p => p[0] === pos[0] && p[1] === pos[1])) {
                positions.push(pos);
            }
        }
        return positions;
    },

    ensureMinDragons(count) {
        let dragons = 0;
        for (let r = 0; r < 5; r++) {
            for (let row = 0; row < 3; row++) {
                if (this.dragonState.grid[r][row] === '🐉') dragons++;
            }
        }
        
        while (dragons < count) {
            const reel = Math.floor(Math.random() * 5);
            const row = Math.floor(Math.random() * 3);
            if (this.dragonState.grid[reel][row] !== '🐉') {
                this.dragonState.grid[reel][row] = '🐉';
                dragons++;
            }
        }
    },

    stopDragonReelsSequentially(reels, bet) {
        let reelIndex = 0;
        
        const stopNextReel = () => {
            if (reelIndex >= 5) {
                // All reels stopped - apply dragon fire and calculate wins
                this.applyDragonFire(bet);
                return;
            }
            
            const reel = reels[reelIndex];
            const symbols = reel.querySelectorAll('.dragon-symbol');
            
            symbols.forEach((sym, row) => {
                sym.classList.remove('spinning');
                sym.textContent = this.dragonState.grid[reelIndex][row];
                
                // Fire breath animation for dragons
                if (this.dragonState.grid[reelIndex][row] === '🐉') {
                    sym.classList.add('fire-breath');
                    setTimeout(() => sym.classList.remove('fire-breath'), 500);
                }
            });
            
            reelIndex++;
            setTimeout(stopNextReel, 300);
        };
        
        setTimeout(stopNextReel, 500);
    },

    applyDragonFire(bet) {
        // Dragons breathe fire on adjacent symbols, turning them wild
        const firePositions = [];
        
        for (let reel = 0; reel < 5; reel++) {
            for (let row = 0; row < 3; row++) {
                if (this.dragonState.grid[reel][row] === '🐉') {
                    // Fire spreads to adjacent positions
                    const adjacent = [
                        [reel - 1, row], [reel + 1, row],
                        [reel, row - 1], [reel, row + 1]
                    ];
                    adjacent.forEach(([r, ro]) => {
                        if (r >= 0 && r < 5 && ro >= 0 && ro < 3) {
                            if (!firePositions.some(p => p[0] === r && p[1] === ro)) {
                                firePositions.push([r, ro]);
                            }
                        }
                    });
                }
            }
        }
        
        this.dragonState.fireDragons = firePositions;
        
        // Animate fire positions
        firePositions.forEach(([reel, row]) => {
            const reelEl = document.getElementById(`dragonReel${reel + 1}`);
            if (reelEl) {
                const symbol = reelEl.querySelectorAll('.dragon-symbol')[row];
                if (symbol && this.dragonState.grid[reel][row] !== '🐉') {
                    symbol.classList.add('fire-breath');
                    setTimeout(() => symbol.classList.remove('fire-breath'), 600);
                }
            }
        });
        
        setTimeout(() => this.calculateDragonPaylines(bet), 700);
    },

    calculateDragonPaylines(bet) {
        let totalWin = 0;
        let winningLines = [];
        const grid = this.dragonState.grid;
        const firePositions = this.dragonState.fireDragons;
        
        // Check for scatter (eggs)
        let scatterCount = 0;
        for (let r = 0; r < 5; r++) {
            for (let row = 0; row < 3; row++) {
                if (grid[r][row] === '🥚') scatterCount++;
            }
        }
        
        // Free spins trigger
        if (scatterCount >= 3 && this.dragonState.freeSpins === 0) {
            this.dragonState.freeSpins = 5 + (scatterCount - 3) * 3;
            this.dragonState.fireMultiplier = 2;
            
            const freeSpinCounter = document.getElementById('dragonFreeSpinsCounter');
            freeSpinCounter.style.display = 'block';
            document.getElementById('dragonFreeSpinsLeft').textContent = this.dragonState.freeSpins;
            document.getElementById('dragonFireMult').textContent = this.dragonState.fireMultiplier + 'x';
            
            // Play dragon sound for free spins if not muted
            if (!this.isGameMuted('dragon')) {
                this.playSound('dragon_awaken');
            }
        }
        
        // Check each payline
        this.dragonPaylines.forEach((payline, lineIndex) => {
            const symbols = payline.map(([reel, row]) => {
                // Check if position is fire-enhanced (acts as wild)
                if (firePositions.some(p => p[0] === reel && p[1] === row)) {
                    return { symbol: grid[reel][row], isFireWild: true };
                }
                return { symbol: grid[reel][row], isFireWild: false };
            });
            
            // Find first non-wild symbol
            let matchSymbol = null;
            for (const s of symbols) {
                if (s.symbol !== '🐉' && !s.isFireWild && s.symbol !== '🥚') {
                    matchSymbol = s.symbol;
                    break;
                }
            }
            
            if (!matchSymbol) {
                // All wilds/dragons
                matchSymbol = '🐉';
            }
            
            // Count matching from left
            let matchCount = 0;
            for (const s of symbols) {
                if (s.symbol === matchSymbol || s.symbol === '🐉' || s.isFireWild) {
                    matchCount++;
                } else {
                    break;
                }
            }
            
            // Get payout
            if (matchCount >= 3) {
                const symbolData = this.dragonSymbols.find(s => s.symbol === matchSymbol);
                if (symbolData && symbolData.payouts && symbolData.payouts[matchCount]) {
                    const lineWin = symbolData.payouts[matchCount] * bet;
                    totalWin += lineWin;
                    winningLines.push({ line: lineIndex, count: matchCount, symbol: matchSymbol });
                }
            }
        });
        
        // Apply free spin multiplier
        if (this.dragonState.freeSpins > 0) {
            totalWin = Math.floor(totalWin * this.dragonState.fireMultiplier);
        }
        
        // Highlight winning symbols
        winningLines.forEach(({ line }) => {
            this.dragonPaylines[line].forEach(([reel, row]) => {
                const reelEl = document.getElementById(`dragonReel${reel + 1}`);
                if (reelEl) {
                    const symbol = reelEl.querySelectorAll('.dragon-symbol')[row];
                    symbol.classList.add('winning');
                    setTimeout(() => symbol.classList.remove('winning'), 1500);
                }
            });
        });
        
        // Update display
        const resultDiv = document.getElementById('dragonResult');
        const spinBtn = document.getElementById('spinDragon');
        const fireSpinBtn = document.getElementById('fireSpinDragon');
        
        if (totalWin > 0) {
            GAME.state.coins += totalWin;
            GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + totalWin;
            this.trackCasinoGame(bet, totalWin);
            document.getElementById('dragonLastWin').textContent = GAME.formatNumber(totalWin);
            
            if (winningLines.length > 0) {
                document.getElementById('dragonMultiplierValue').textContent = 
                    Math.max(...winningLines.map(w => this.dragonSymbols.find(s => s.symbol === w.symbol)?.payouts[w.count] || 0)) + 'x';
            }
            
            const freeSpinMsg = this.dragonState.freeSpins > 0 ? ` (${this.dragonState.fireMultiplier}x Fire!)` : '';
            resultDiv.innerHTML = `🔥 Dragon's Fortune! Won ${GAME.formatNumber(totalWin)} coins on ${winningLines.length} line(s)!${freeSpinMsg}`;
            resultDiv.className = 'game-result win' + (totalWin >= bet * 10 ? ' jackpot' : '');
            
            // Play dragon sound for wins if not muted
            if (!this.isGameMuted('dragon')) {
                this.playSound('dragon_awaken');
            }
        } else {
            this.trackCasinoGame(bet, 0);
            resultDiv.textContent = '🐉 The dragon sleeps... No win this spin.';
            resultDiv.className = 'game-result lose';
        }
        
        // Handle free spins
        if (this.dragonState.freeSpins > 0) {
            this.dragonState.freeSpins--;
            document.getElementById('dragonFreeSpinsLeft').textContent = this.dragonState.freeSpins;
            
            if (this.dragonState.freeSpins === 0) {
                document.getElementById('dragonFreeSpinsCounter').style.display = 'none';
                this.dragonState.fireMultiplier = 1;
            }
        }
        
        this.dragonState.spinning = false;
        spinBtn.disabled = false;
        fireSpinBtn.disabled = false;
        this.updateDragonSpinCost();
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
    },

    // ==================== COSMIC FORTUNE SLOT ====================
    
    cosmicState: {
        currentBet: 0,
        freeSpins: 0,
        spinning: false,
        grid: [],
        expandedReels: [], // Reels with expanding wilds
        allStarsExpand: false // During free spins, all stars expand
    },

    // Cosmic slot symbols with weights and payouts
    cosmicSymbols: [
        { symbol: '⭐', name: 'Star', weight: 8, payouts: { 3: 5, 4: 15, 5: 50 }, isWild: true, expands: true },
        { symbol: '🚀', name: 'Rocket', weight: 10, payouts: { 3: 4, 4: 12, 5: 60 } },
        { symbol: '🪐', name: 'Planet', weight: 15, payouts: { 3: 2.5, 4: 7, 5: 35 } },
        { symbol: '🛸', name: 'UFO', weight: 20, payouts: { 3: 1.5, 4: 5, 5: 25 } },
        { symbol: '🌙', name: 'Moon', weight: 25, payouts: { 3: 1, 4: 3, 5: 15 } },
        { symbol: '☄️', name: 'Comet', weight: 7, payouts: { 3: 0, 4: 0, 5: 0 }, isScatter: true }
    ],

    // 20 paylines (same structure)
    cosmicPaylines: [
        [[0,0], [1,0], [2,0], [3,0], [4,0]],
        [[0,1], [1,1], [2,1], [3,1], [4,1]],
        [[0,2], [1,2], [2,2], [3,2], [4,2]],
        [[0,0], [1,1], [2,2], [3,1], [4,0]],
        [[0,2], [1,1], [2,0], [3,1], [4,2]],
        [[0,0], [1,0], [2,1], [3,2], [4,2]],
        [[0,2], [1,2], [2,1], [3,0], [4,0]],
        [[0,1], [1,0], [2,0], [3,0], [4,1]],
        [[0,1], [1,2], [2,2], [3,2], [4,1]],
        [[0,0], [1,1], [2,0], [3,1], [4,0]],
        [[0,2], [1,1], [2,2], [3,1], [4,2]],
        [[0,1], [1,0], [2,1], [3,2], [4,1]],
        [[0,1], [1,2], [2,1], [3,0], [4,1]],
        [[0,0], [1,2], [2,0], [3,2], [4,0]],
        [[0,2], [1,0], [2,2], [3,0], [4,2]],
        [[0,0], [1,0], [2,0], [3,1], [4,2]],
        [[0,2], [1,2], [2,2], [3,1], [4,0]],
        [[0,1], [1,1], [2,0], [3,1], [4,1]],
        [[0,1], [1,1], [2,2], [3,1], [4,1]],
        [[0,0], [1,1], [2,1], [3,1], [4,2]]
    ],

    setupCosmic() {
        const spinBtn = document.getElementById('spinCosmic');
        spinBtn.onclick = () => this.spinCosmic(false);
        
        const warpSpinBtn = document.getElementById('warpSpinCosmic');
        warpSpinBtn.onclick = () => this.spinCosmic(true);
        
        this.updateCosmicSpinCost();
    },

    updateCosmicSpinCost() {
        const costSpan = document.getElementById('warpSpinCost');
        if (costSpan) {
            const bet = this.getBetValue('cosmicBet') || 10;
            costSpan.textContent = GAME.formatNumber(bet * 100);
        }
    },

    /**
     * Spin with max affordable warp drive bet
     */
    spinMaxCosmicWarp() {
        const maxBet = Math.floor(GAME.state.coins / 100);
        
        if (maxBet < 1) {
            const resultDiv = document.getElementById('cosmicResult');
            resultDiv.textContent = 'Not enough coins for Warp Drive! Need at least 100 coins.';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        const betInput = document.getElementById('cosmicBet');
        if (betInput) {
            betInput.dataset.rawValue = this.numberToFullString(maxBet);
            betInput.value = this.formatBetDisplay(maxBet);
        }
        
        this.updateCosmicSpinCost();
        this.spinCosmic(true);
    },

    getRandomCosmicSymbol() {
        const totalWeight = this.cosmicSymbols.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const symbolData of this.cosmicSymbols) {
            random -= symbolData.weight;
            if (random <= 0) return symbolData.symbol;
        }
        return this.cosmicSymbols[0].symbol;
    },

    spinCosmic(isWarpSpin = false) {
        if (this.cosmicState.spinning) return;
        
        const bet = this.getBetValue('cosmicBet');
        const resultDiv = document.getElementById('cosmicResult');
        const spinBtn = document.getElementById('spinCosmic');
        const warpSpinBtn = document.getElementById('warpSpinCosmic');
        
        const cost = isWarpSpin ? bet * 100 : (this.cosmicState.freeSpins > 0 ? 0 : bet);
        
        if (cost > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        if (cost > 0) {
            // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
            // For warp spins, we handle the cost manually since it's 100x bet
            if (!isWarpSpin) {
                if (!this.processCasinoBet(bet)) {
                    resultDiv.textContent = 'Bet processing failed!';
                    resultDiv.className = 'game-result lose';
                    return;
                }
            } else {
                GAME.state.coins -= cost;
                GAME.state.casinoTotalWagered = (GAME.state.casinoTotalWagered || 0) + bet;
                GAME.state.casinoGamesPlayed = (GAME.state.casinoGamesPlayed || 0) + 1;
            }
        }
        
        this.cosmicState.spinning = true;
        this.cosmicState.currentBet = bet;
        this.cosmicState.expandedReels = [];
        spinBtn.disabled = true;
        warpSpinBtn.disabled = true;
        resultDiv.textContent = '🌌 Traveling through space...';
        resultDiv.className = 'game-result';
        
        // Clear previous expanded state
        for (let i = 1; i <= 5; i++) {
            document.getElementById(`cosmicReel${i}`).classList.remove('expanded-wild');
        }
        
        // Generate grid
        this.cosmicState.grid = [];
        for (let reel = 0; reel < 5; reel++) {
            this.cosmicState.grid[reel] = [];
            for (let row = 0; row < 3; row++) {
                this.cosmicState.grid[reel][row] = this.getRandomCosmicSymbol();
            }
        }
        
        // Warp spin guarantees 2-4 expanding stars
        if (isWarpSpin) {
            const starCount = 2 + Math.floor(Math.random() * 3);
            const starReels = [];
            while (starReels.length < starCount) {
                const reel = Math.floor(Math.random() * 5);
                if (!starReels.includes(reel)) {
                    starReels.push(reel);
                    const row = Math.floor(Math.random() * 3);
                    this.cosmicState.grid[reel][row] = '⭐';
                }
            }
        }
        
        // Animate reels
        const reels = [];
        for (let i = 1; i <= 5; i++) {
            reels.push(document.getElementById(`cosmicReel${i}`));
        }
        
        reels.forEach(reel => {
            reel.querySelectorAll('.cosmic-symbol').forEach(sym => sym.classList.add('spinning'));
        });
        
        this.stopCosmicReelsSequentially(reels, bet);
    },

    stopCosmicReelsSequentially(reels, bet) {
        let reelIndex = 0;
        
        const stopNextReel = () => {
            if (reelIndex >= 5) {
                this.expandCosmicWilds(bet);
                return;
            }
            
            const reel = reels[reelIndex];
            const symbols = reel.querySelectorAll('.cosmic-symbol');
            let hasStar = false;
            
            symbols.forEach((sym, row) => {
                sym.classList.remove('spinning');
                sym.textContent = this.cosmicState.grid[reelIndex][row];
                if (this.cosmicState.grid[reelIndex][row] === '⭐') {
                    hasStar = true;
                }
            });
            
            // Check if this reel has a star
            if (hasStar || (this.cosmicState.allStarsExpand && this.cosmicState.grid[reelIndex].includes('⭐'))) {
                this.cosmicState.expandedReels.push(reelIndex);
            }
            
            reelIndex++;
            setTimeout(stopNextReel, 300);
        };
        
        setTimeout(stopNextReel, 500);
    },

    expandCosmicWilds(bet) {
        // Expand stars to fill entire reels
        const expandedReels = [];
        
        for (let reel = 0; reel < 5; reel++) {
            let hasStar = this.cosmicState.grid[reel].includes('⭐');
            
            // During free spins or warp spin, stars always expand
            if (hasStar || (this.cosmicState.allStarsExpand && hasStar)) {
                expandedReels.push(reel);
                
                // Fill entire reel with stars
                for (let row = 0; row < 3; row++) {
                    this.cosmicState.grid[reel][row] = '⭐';
                }
                
                // Animate expansion
                const reelEl = document.getElementById(`cosmicReel${reel + 1}`);
                reelEl.classList.add('expanded-wild');
                
                reelEl.querySelectorAll('.cosmic-symbol').forEach(sym => {
                    sym.textContent = '⭐';
                    sym.classList.add('expanding');
                    setTimeout(() => sym.classList.remove('expanding'), 600);
                });
            }
        }
        
        this.cosmicState.expandedReels = expandedReels;
        document.getElementById('cosmicExpandingCount').textContent = expandedReels.length;
        
        // Play cosmic sound for expanding wilds if not muted
        if (expandedReels.length > 0 && !this.isGameMuted('cosmic')) {
            this.playSound('cosmic_explore');
        }
        
        setTimeout(() => this.calculateCosmicPaylines(bet), 700);
    },

    calculateCosmicPaylines(bet) {
        let totalWin = 0;
        let winningLines = [];
        const grid = this.cosmicState.grid;
        
        // Check for scatter (comets)
        let scatterCount = 0;
        for (let r = 0; r < 5; r++) {
            for (let row = 0; row < 3; row++) {
                if (grid[r][row] === '☄️') scatterCount++;
            }
        }
        
        // Free spins trigger
        if (scatterCount >= 3 && this.cosmicState.freeSpins === 0) {
            this.cosmicState.freeSpins = 8 + (scatterCount - 3) * 4;
            this.cosmicState.allStarsExpand = true;
            
            const freeSpinCounter = document.getElementById('cosmicFreeSpinsCounter');
            freeSpinCounter.style.display = 'block';
            document.getElementById('cosmicFreeSpinsLeft').textContent = this.cosmicState.freeSpins;
            
            // Play cosmic sound for free spins if not muted
            if (!this.isGameMuted('cosmic')) {
                this.playSound('cosmic_explore');
            }
        }
        
        // Check each payline
        this.cosmicPaylines.forEach((payline, lineIndex) => {
            const symbols = payline.map(([reel, row]) => grid[reel][row]);
            
            // Find first non-wild symbol
            let matchSymbol = null;
            for (const s of symbols) {
                if (s !== '⭐' && s !== '☄️') {
                    matchSymbol = s;
                    break;
                }
            }
            
            if (!matchSymbol) {
                matchSymbol = '⭐'; // All wilds
            }
            
            // Count matching from left
            let matchCount = 0;
            for (const s of symbols) {
                if (s === matchSymbol || s === '⭐') {
                    matchCount++;
                } else {
                    break;
                }
            }
            
            // Get payout
            if (matchCount >= 3) {
                const symbolData = this.cosmicSymbols.find(s => s.symbol === matchSymbol);
                if (symbolData && symbolData.payouts && symbolData.payouts[matchCount]) {
                    const lineWin = symbolData.payouts[matchCount] * bet;
                    totalWin += lineWin;
                    winningLines.push({ line: lineIndex, count: matchCount, symbol: matchSymbol });
                }
            }
        });
        
        // Bonus for expanding wilds
        if (this.cosmicState.expandedReels.length >= 2) {
            totalWin = Math.floor(totalWin * (1 + this.cosmicState.expandedReels.length * 0.5));
        }
        
        // Highlight winning symbols
        winningLines.forEach(({ line }) => {
            this.cosmicPaylines[line].forEach(([reel, row]) => {
                const reelEl = document.getElementById(`cosmicReel${reel + 1}`);
                if (reelEl) {
                    const symbol = reelEl.querySelectorAll('.cosmic-symbol')[row];
                    symbol.classList.add('winning');
                    setTimeout(() => symbol.classList.remove('winning'), 1500);
                }
            });
        });
        
        // Update display
        const resultDiv = document.getElementById('cosmicResult');
        const spinBtn = document.getElementById('spinCosmic');
        const warpSpinBtn = document.getElementById('warpSpinCosmic');
        
        if (totalWin > 0) {
            GAME.state.coins += totalWin;
            GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + totalWin;
            this.trackCasinoGame(bet, totalWin);
            document.getElementById('cosmicLastWin').textContent = GAME.formatNumber(totalWin);
            
            const expandMsg = this.cosmicState.expandedReels.length > 0 
                ? ` (${this.cosmicState.expandedReels.length} Expanding Wild${this.cosmicState.expandedReels.length > 1 ? 's' : ''}!)` 
                : '';
            resultDiv.innerHTML = `🌟 Cosmic Fortune! Won ${GAME.formatNumber(totalWin)} coins!${expandMsg}`;
            resultDiv.className = 'game-result win' + (totalWin >= bet * 10 ? ' jackpot' : '');
            
            // Play cosmic sound for wins if not muted
            if (!this.isGameMuted('cosmic')) {
                this.playSound('cosmic_explore');
            }
        } else {
            this.trackCasinoGame(bet, 0);
            resultDiv.textContent = '🌌 Lost in space... No win this spin.';
            resultDiv.className = 'game-result lose';
        }
        
        // Handle free spins
        if (this.cosmicState.freeSpins > 0) {
            this.cosmicState.freeSpins--;
            document.getElementById('cosmicFreeSpinsLeft').textContent = this.cosmicState.freeSpins;
            
            if (this.cosmicState.freeSpins === 0) {
                document.getElementById('cosmicFreeSpinsCounter').style.display = 'none';
                this.cosmicState.allStarsExpand = false;
            }
        }
        
        this.cosmicState.spinning = false;
        spinBtn.disabled = false;
        warpSpinBtn.disabled = false;
        this.updateCosmicSpinCost();
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
    },

    // ==================== CANDY CASCADE (SWEET BONANZA STYLE) ====================
    
    candyState: {
        currentBet: 0,
        freeSpins: 0,
        spinning: false,
        grid: [], // 6x5 grid
        tumbleCount: 0,
        totalWin: 0,
        currentMultiplier: 1,
        multiplierBombs: [] // Active multiplier bombs this spin
    },

    // Candy symbols with scatter pay requirements (8+ anywhere)
    candySymbols: [
        { symbol: '💎', name: 'Heart Gem', weight: 5, payouts: { 8: 6, 10: 12, 12: 25 }, tier: 'premium' },
        { symbol: '🍭', name: 'Lollipop', weight: 8, payouts: { 8: 4, 10: 8, 12: 12 }, tier: 'premium' },
        { symbol: '🍬', name: 'Candy', weight: 12, payouts: { 8: 2, 10: 4, 12: 8 }, tier: 'high' },
        { symbol: '🍩', name: 'Donut', weight: 15, payouts: { 8: 1, 10: 2.5, 12: 5 }, tier: 'high' },
        { symbol: '🧁', name: 'Cupcake', weight: 18, payouts: { 8: 0.75, 10: 1.5, 12: 3 }, tier: 'mid' },
        { symbol: '🍪', name: 'Cookie', weight: 20, payouts: { 8: 0.5, 10: 1, 12: 2 }, tier: 'mid' },
        { symbol: '🍇', name: 'Grapes', weight: 22, payouts: { 8: 0.4, 10: 0.75, 12: 1.5 }, tier: 'low' },
        { symbol: '🍎', name: 'Apple', weight: 25, payouts: { 8: 0.25, 10: 0.5, 12: 1 }, tier: 'low' }
    ],

    // Scatter symbol
    candyScatter: { symbol: '💫', name: 'Scatter', weight: 3 },
    
    // Multiplier bombs that can appear during tumbles
    candyMultipliers: [2, 3, 5, 8, 10, 15],

    setupCandy() {
        const spinBtn = document.getElementById('spinCandy');
        if (spinBtn) {
            spinBtn.onclick = () => this.spinCandy();
        }
        
        const buyBonusBtn = document.getElementById('buyCandyBonus');
        if (buyBonusBtn) {
            buyBonusBtn.onclick = () => this.buyCandyBonus();
        }
        
        const maxBuyBonusBtn = document.getElementById('maxBuyCandyBonus');
        if (maxBuyBonusBtn) {
            maxBuyBonusBtn.onclick = () => this.maxBuyCandyBonus();
        }
        
        this.updateCandyBonusCost();
        this.initCandyGrid();
    },

    updateCandyBonusCost() {
        const costSpan = document.getElementById('candyBonusCost');
        if (costSpan) {
            const bet = this.getBetValue('candyBet') || 10;
            costSpan.textContent = GAME.formatNumber(bet * 100);
        }
        
        // Update max buy cost display
        const maxCostSpan = document.getElementById('candyMaxBonusCost');
        if (maxCostSpan) {
            const maxAffordable = Math.floor(GAME.state.coins / 100);
            if (maxAffordable > 0) {
                maxCostSpan.textContent = GAME.formatNumber(maxAffordable * 100);
            } else {
                maxCostSpan.textContent = 'Need 100+';
            }
        }
    },

    initCandyGrid() {
        const gridEl = document.getElementById('candyGrid');
        if (!gridEl) return;
        
        gridEl.innerHTML = '';
        this.candyState.grid = [];
        
        // Create 6x5 grid (6 columns, 5 rows)
        for (let row = 0; row < 5; row++) {
            this.candyState.grid[row] = [];
            for (let col = 0; col < 6; col++) {
                const symbol = this.getRandomCandySymbol();
                this.candyState.grid[row][col] = symbol;
                
                const cell = document.createElement('div');
                cell.className = 'candy-symbol';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.textContent = symbol;
                gridEl.appendChild(cell);
            }
        }
    },

    getRandomCandySymbol(includeScatter = true) {
        const symbols = [...this.candySymbols];
        if (includeScatter) {
            symbols.push(this.candyScatter);
        }
        
        const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const symbolData of symbols) {
            random -= symbolData.weight;
            if (random <= 0) return symbolData.symbol;
        }
        return this.candySymbols[0].symbol;
    },

    getRandomMultiplierBomb() {
        // Higher multipliers are rarer
        const weights = [30, 25, 18, 12, 8, 4, 2, 0.8, 0.2]; // Corresponding to multipliers
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return this.candyMultipliers[i];
        }
        return this.candyMultipliers[0];
    },

    buyCandyBonus() {
        const bet = this.getBetValue('candyBet');
        const cost = bet * 100;
        const resultDiv = document.getElementById('candyResult');
        
        if (cost > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins to buy bonus!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        GAME.state.coins -= cost;
        GAME.state.casinoTotalWagered = (GAME.state.casinoTotalWagered || 0) + cost;
        
        this.candyState.freeSpins = 10;
        this.candyState.currentMultiplier = 1;
        document.getElementById('candyFreeSpins').textContent = '10';
        document.getElementById('candyFreeSpinsBanner').style.display = 'block';
        document.getElementById('candyFreeSpinsLeft').textContent = '10';
        
        resultDiv.textContent = '🎰 Bonus Bought! 10 Free Spins with Multipliers!';
        resultDiv.className = 'game-result win';
        
        this.updateDisplay();
        this.spinCandy();
    },

    maxBuyCandyBonus() {
        // Calculate max bet that we can afford for bonus (100x multiplier)
        const maxBet = Math.floor(GAME.state.coins / 100);
        const resultDiv = document.getElementById('candyResult');
        
        if (maxBet < 1) {
            resultDiv.textContent = 'Not enough coins for Max Buy! Need at least 100 coins.';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Set the bet input to max
        const betInput = document.getElementById('candyBet');
        if (betInput) {
            betInput.dataset.rawValue = this.numberToFullString(maxBet);
            betInput.value = this.formatBetDisplay(maxBet);
        }
        
        // Update cost displays
        this.updateCandyBonusCost();
        
        // Perform the bonus buy
        this.buyCandyBonus();
    },

    async spinCandy() {
        if (this.candyState.spinning) return;
        
        const bet = this.getBetValue('candyBet');
        const resultDiv = document.getElementById('candyResult');
        const spinBtn = document.getElementById('spinCandy');
        
        const isFreeSpins = this.candyState.freeSpins > 0;
        const cost = isFreeSpins ? 0 : bet;
        
        if (cost > GAME.state.coins) {
            resultDiv.textContent = 'Not enough coins!';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        if (cost > 0) {
            // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
            if (!this.processCasinoBet(bet)) {
                resultDiv.textContent = 'Bet processing failed!';
                resultDiv.className = 'game-result lose';
                return;
            }
        }
        
        this.candyState.spinning = true;
        this.candyState.currentBet = bet;
        this.candyState.tumbleCount = 0;
        this.candyState.totalWin = 0;
        this.candyState.multiplierBombs = [];
        
        if (!isFreeSpins) {
            this.candyState.currentMultiplier = 1;
        }
        
        spinBtn.disabled = true;
        resultDiv.textContent = '🍬 Spinning the sweets...';
        resultDiv.className = 'game-result';
        
        document.getElementById('candyTumbleCount').textContent = '0';
        document.getElementById('candyTotalWin').textContent = '0';
        document.getElementById('candyMultiplierDisplay').style.display = 'none';
        
        // Generate new grid
        await this.generateCandyGrid();
        
        // Start tumble chain
        await this.processCandyTumbles();
        
        // Finalize results
        this.finalizeCandySpin();
    },

    async generateCandyGrid() {
        const gridEl = document.getElementById('candyGrid');
        const cells = gridEl.querySelectorAll('.candy-symbol');
        
        // Animate out
        cells.forEach(cell => cell.classList.add('removing'));
        await this.sleep(300);
        
        // Generate new symbols
        this.candyState.grid = [];
        for (let row = 0; row < 5; row++) {
            this.candyState.grid[row] = [];
            for (let col = 0; col < 6; col++) {
                this.candyState.grid[row][col] = this.getRandomCandySymbol();
            }
        }
        
        // Update display
        this.updateCandyGridDisplay();
        
        // Animate in - drop column by column like Sweet Bonanza
        const newCells = gridEl.querySelectorAll('.candy-symbol');
        newCells.forEach((cell, i) => {
            const col = i % 6;
            const row = Math.floor(i / 6);
            const delay = col * 60 + row * 40; // Column first, then row
            cell.style.opacity = '0';
            cell.style.transform = 'translateY(-80px)';
            
            setTimeout(() => {
                cell.style.opacity = '';
                cell.style.transform = '';
                cell.classList.add('falling');
                setTimeout(() => {
                    cell.classList.remove('falling');
                    cell.classList.add('landed');
                    setTimeout(() => cell.classList.remove('landed'), 250);
                }, 350);
            }, delay);
        });
        
        await this.sleep(500);
    },

    updateCandyGridDisplay() {
        const gridEl = document.getElementById('candyGrid');
        gridEl.innerHTML = '';
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 6; col++) {
                const symbol = this.candyState.grid[row][col];
                const cell = document.createElement('div');
                cell.className = 'candy-symbol';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.textContent = symbol;
                
                // Add scatter class for rainbow glow
                if (symbol === '💫') {
                    cell.classList.add('scatter');
                }
                
                // Check if this is a multiplier bomb position
                const bombIndex = this.candyState.multiplierBombs.findIndex(
                    b => b.row === row && b.col === col
                );
                if (bombIndex !== -1) {
                    cell.classList.add('multiplier-bomb');
                    cell.textContent = `x${this.candyState.multiplierBombs[bombIndex].value}`;
                }
                
                gridEl.appendChild(cell);
            }
        }
    },

    async processCandyTumbles() {
        let hasWin = true;
        
        while (hasWin) {
            const winResult = this.evaluateCandyWins();
            
            if (winResult.totalWin > 0) {
                this.candyState.tumbleCount++;
                document.getElementById('candyTumbleCount').textContent = this.candyState.tumbleCount;
                
                // Apply multiplier
                const winWithMultiplier = Math.floor(winResult.totalWin * this.candyState.currentMultiplier);
                this.candyState.totalWin += winWithMultiplier;
                document.getElementById('candyTotalWin').textContent = GAME.formatNumber(this.candyState.totalWin);
                
                // Highlight winning symbols
                await this.highlightCandyWins(winResult.winningPositions);
                
                // Check for scatters (free spins trigger)
                if (winResult.scatterCount >= 4 && this.candyState.freeSpins === 0) {
                    this.candyState.freeSpins = 10;
                    document.getElementById('candyFreeSpins').textContent = '10';
                    document.getElementById('candyFreeSpinsBanner').style.display = 'block';
                    document.getElementById('candyFreeSpinsLeft').textContent = '10';
                    
                    const resultDiv = document.getElementById('candyResult');
                    resultDiv.textContent = '💫 FREE SPINS TRIGGERED! 10 Free Spins!';
                    resultDiv.className = 'game-result win jackpot';
                }
                
                // Remove winning symbols
                await this.removeCandyWinningSymbols(winResult.winningPositions);
                
                // Maybe spawn multiplier bombs during free spins
                if (this.candyState.freeSpins > 0 && Math.random() < 0.3) {
                    await this.spawnMultiplierBomb();
                }
                
                // Tumble down
                await this.tumbleCandySymbols();
                
                hasWin = true;
            } else {
                hasWin = false;
            }
        }
    },

    evaluateCandyWins() {
        const symbolCounts = {};
        const symbolPositions = {};
        let scatterCount = 0;
        const scatterPositions = [];
        
        // Count symbols
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 6; col++) {
                const symbol = this.candyState.grid[row][col];
                if (!symbol) continue;
                
                if (symbol === '💫') {
                    scatterCount++;
                    scatterPositions.push({ row, col });
                } else {
                    symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
                    if (!symbolPositions[symbol]) symbolPositions[symbol] = [];
                    symbolPositions[symbol].push({ row, col });
                }
            }
        }
        
        let totalWin = 0;
        const winningPositions = [];
        const bet = this.candyState.currentBet;
        
        // Check each symbol for 8+ matches
        for (const [symbol, count] of Object.entries(symbolCounts)) {
            if (count >= 8) {
                const symbolData = this.candySymbols.find(s => s.symbol === symbol);
                if (symbolData) {
                    let payoutKey = 8;
                    if (count >= 12) payoutKey = 12;
                    else if (count >= 10) payoutKey = 10;
                    
                    const payout = symbolData.payouts[payoutKey] || 0;
                    totalWin += Math.floor(bet * payout);
                    winningPositions.push(...symbolPositions[symbol]);
                }
            }
        }
        
        // Add scatter positions if they triggered
        if (scatterCount >= 4) {
            winningPositions.push(...scatterPositions);
        }
        
        return { totalWin, winningPositions, scatterCount };
    },

    async highlightCandyWins(positions) {
        const gridEl = document.getElementById('candyGrid');
        const cells = gridEl.querySelectorAll('.candy-symbol');
        
        positions.forEach(pos => {
            const index = pos.row * 6 + pos.col;
            if (cells[index]) {
                cells[index].classList.add('winning');
            }
        });
        
        // Big win effects for lots of matches
        if (positions.length >= 12) {
            gridEl.classList.add('shaking');
            positions.forEach(pos => {
                const index = pos.row * 6 + pos.col;
                if (cells[index]) {
                    cells[index].classList.add('big-win');
                }
            });
            // Spawn confetti
            this.spawnCandyConfetti();
            setTimeout(() => gridEl.classList.remove('shaking'), 500);
        }
        
        // Show win amount
        if (this.candyState.totalWin > 0) {
            const winDisplay = document.getElementById('candyWinDisplay');
            const winAmount = document.getElementById('candyWinAmount');
            winAmount.textContent = `+${GAME.formatNumber(this.candyState.totalWin)}`;
            winDisplay.style.display = 'block';
            
            await this.sleep(600);
            winDisplay.style.display = 'none';
        }
        
        await this.sleep(400);
    },

    async removeCandyWinningSymbols(positions) {
        const gridEl = document.getElementById('candyGrid');
        const cells = gridEl.querySelectorAll('.candy-symbol');
        
        // Check for multiplier bombs in winning positions
        for (const pos of positions) {
            const bombIndex = this.candyState.multiplierBombs.findIndex(
                b => b.row === pos.row && b.col === pos.col
            );
            if (bombIndex !== -1) {
                const bomb = this.candyState.multiplierBombs[bombIndex];
                const index = pos.row * 6 + pos.col;
                
                // Add explosion animation to the bomb cell
                if (cells[index]) {
                    cells[index].classList.add('multiplier-exploding');
                }
                
                this.candyState.currentMultiplier += bomb.value;
                this.candyState.multiplierBombs.splice(bombIndex, 1);
                
                // Show multiplier update
                const multiplierDisplay = document.getElementById('candyMultiplierDisplay');
                const multiplierValue = document.getElementById('candyCurrentMultiplier');
                multiplierValue.textContent = `x${this.candyState.currentMultiplier}`;
                multiplierDisplay.style.display = 'block';
                
                // Flash the multiplier display
                multiplierDisplay.style.animation = 'none';
                multiplierDisplay.offsetHeight; // Trigger reflow
                multiplierDisplay.style.animation = 'candyMultiplierPulse 0.3s ease-in-out 3';
            }
        }
        
        // Mark for removal
        positions.forEach(pos => {
            const index = pos.row * 6 + pos.col;
            if (cells[index]) {
                cells[index].classList.add('removing');
            }
            this.candyState.grid[pos.row][pos.col] = null;
        });
        
        await this.sleep(300);
    },

    async spawnMultiplierBomb() {
        // Find empty position or random position
        const emptyPositions = [];
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 6; col++) {
                if (!this.candyState.grid[row][col]) {
                    emptyPositions.push({ row, col });
                }
            }
        }
        
        if (emptyPositions.length > 0) {
            const pos = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            const value = this.getRandomMultiplierBomb();
            this.candyState.multiplierBombs.push({ ...pos, value });
        }
    },

    spawnCandyConfetti() {
        const container = document.getElementById('candyGame');
        if (!container) return;
        
        const colors = ['#ff1493', '#ffd700', '#ff69b4', '#00ff00', '#00bfff', '#ff4500', '#9400d3'];
        const gridFrame = container.querySelector('.candy-grid-frame');
        const rect = gridFrame ? gridFrame.getBoundingClientRect() : container.getBoundingClientRect();
        
        for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'candy-confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.top = `${Math.random() * 50 + 25}%`;
            confetti.style.animationDelay = `${Math.random() * 0.3}s`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            container.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 1500);
        }
    },

    async tumbleCandySymbols() {
        // Play tumbling sound if not muted
        if (!this.isGameMuted('candy')) {
            this.playSound('candy_cascade');
        }
        // For each column, drop symbols down and fill from top
        for (let col = 0; col < 6; col++) {
            // Get non-null symbols in column (bottom to top)
            const columnSymbols = [];
            for (let row = 4; row >= 0; row--) {
                if (this.candyState.grid[row][col]) {
                    columnSymbols.push(this.candyState.grid[row][col]);
                }
            }
            
            // Fill column from bottom with existing symbols
            for (let row = 4; row >= 0; row--) {
                const symbolIndex = 4 - row;
                if (symbolIndex < columnSymbols.length) {
                    this.candyState.grid[row][col] = columnSymbols[symbolIndex];
                } else {
                    // Fill with new symbol
                    this.candyState.grid[row][col] = this.getRandomCandySymbol();
                }
            }
        }
        
        // Update display with smooth drop animation
        this.updateCandyGridDisplay();
        const gridEl = document.getElementById('candyGrid');
        const cells = gridEl.querySelectorAll('.candy-symbol');
        
        // Animate symbols dropping - column by column
        cells.forEach((cell, i) => {
            const col = i % 6;
            const delay = col * 50;
            cell.style.opacity = '0';
            cell.style.transform = 'translateY(-60px)';
            
            setTimeout(() => {
                cell.style.opacity = '';
                cell.style.transform = '';
                cell.classList.add('falling');
                setTimeout(() => {
                    cell.classList.remove('falling');
                    cell.classList.add('landed');
                    setTimeout(() => cell.classList.remove('landed'), 250);
                }, 350);
            }, delay);
        });
        
        await this.sleep(450);
    },

    finalizeCandySpin() {
        const bet = this.candyState.currentBet;
        const totalWin = this.candyState.totalWin;
        const resultDiv = document.getElementById('candyResult');
        const spinBtn = document.getElementById('spinCandy');
        
        if (totalWin > 0) {
            GAME.state.coins += totalWin;
            GAME.state.totalCoinsEarned += totalWin;
            GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + totalWin;
            
            this.trackCasinoGame(bet, totalWin);
            
            const multiplierMsg = this.candyState.currentMultiplier > 1 
                ? ` (x${this.candyState.currentMultiplier} Multiplier!)` 
                : '';
            const tumbleMsg = this.candyState.tumbleCount > 0 
                ? ` ${this.candyState.tumbleCount} tumbles!` 
                : '';
            
            resultDiv.innerHTML = `🍬 Sweet Win! +${GAME.formatNumber(totalWin)} coins!${tumbleMsg}${multiplierMsg}`;
            resultDiv.className = 'game-result win' + (totalWin >= bet * 20 ? ' jackpot' : '');
            
            if (typeof UI !== 'undefined' && UI.playSound) {
                UI.playSound('win');
            }
        } else {
            this.trackCasinoGame(bet, 0);
            resultDiv.textContent = '🍬 No winning combinations. Try again!';
            resultDiv.className = 'game-result lose';
        }
        
        // Handle free spins
        if (this.candyState.freeSpins > 0) {
            this.candyState.freeSpins--;
            document.getElementById('candyFreeSpins').textContent = this.candyState.freeSpins;
            document.getElementById('candyFreeSpinsLeft').textContent = this.candyState.freeSpins;
            
            if (this.candyState.freeSpins === 0) {
                document.getElementById('candyFreeSpinsBanner').style.display = 'none';
                document.getElementById('candyMultiplierDisplay').style.display = 'none';
                this.candyState.currentMultiplier = 1;
            }
        }
        
        this.candyState.spinning = false;
        spinBtn.disabled = false;
        this.updateCandyBonusCost();
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
    },

    /**
     * Setup Foot of Zeus slot game
     */
    setupMidas() {
        const spinBtn = document.getElementById('spinMidas');
        spinBtn.onclick = () => this.spinMidas(false);
        
        const goldenSpinBtn = document.getElementById('goldenSpinMidas');
        if (goldenSpinBtn) {
            goldenSpinBtn.onclick = () => this.spinMidas(true);
        }
        
        // MAX Golden Spin button - sets bet to max affordable and spins
        const maxGoldenSpinBtn = document.getElementById('maxGoldenSpinMidas');
        if (maxGoldenSpinBtn) {
            maxGoldenSpinBtn.onclick = () => this.spinMaxGolden();
        }
        
        // Auto Spin setup
        this.setupMidasAutoSpin();
        
        // Update golden spin cost when bet changes
        const betInput = document.getElementById('midasBet');
        if (betInput) {
            betInput.addEventListener('input', () => this.updateGoldenSpinCost());
        }
        
        // Initialize grid
        this.midasState.grid = Array(5).fill(null).map(() => Array(3).fill(null));
        
        // Update golden spin cost display
        this.updateGoldenSpinCost();
    },

    /**
     * Setup auto spin controls for Midas
     */
    setupMidasAutoSpin() {
        const autoSpinBtn = document.getElementById('autoSpinMidas');
        const autoSpinOptions = document.getElementById('autoSpinOptions');
        const startAutoSpinBtn = document.getElementById('startAutoSpin');
        const stopAutoSpinBtn = document.getElementById('stopAutoSpin');
        
        if (autoSpinBtn) {
            autoSpinBtn.onclick = () => {
                // Toggle options visibility
                const isVisible = autoSpinOptions.style.display !== 'none';
                autoSpinOptions.style.display = isVisible ? 'none' : 'flex';
            };
        }
        
        if (startAutoSpinBtn) {
            startAutoSpinBtn.onclick = () => this.startMidasAutoSpin();
        }
        
        if (stopAutoSpinBtn) {
            stopAutoSpinBtn.onclick = () => this.stopMidasAutoSpin();
        }
    },

    /**
     * Start auto spinning
     */
    startMidasAutoSpin() {
        const spinCount = parseInt(document.getElementById('autoSpinCount').value);
        const stopOnWin = parseInt(document.getElementById('autoSpinStopWin').value) || 0;
        const stopOnFreeSpins = document.getElementById('autoSpinStopFreeSpins').checked;
        
        const bet = this.getBetValue('midasBet');
        if (bet <= 0 || bet > GAME.state.coins) {
            document.getElementById('autoSpinStatus').textContent = 'Invalid bet amount!';
            return;
        }
        
        this.midasState.autoSpinActive = true;
        this.midasState.autoSpinRemaining = spinCount;
        this.midasState.autoSpinTotal = spinCount === -1 ? Infinity : spinCount;
        this.midasState.autoSpinStopOnWin = stopOnWin;
        this.midasState.autoSpinStopOnFreeSpins = stopOnFreeSpins;
        this.midasState.autoSpinTotalWon = 0;
        
        // Update UI
        document.getElementById('autoSpinMidas').classList.add('active');
        document.getElementById('startAutoSpin').style.display = 'none';
        document.getElementById('stopAutoSpin').style.display = 'inline-block';
        
        // Disable golden spin buttons during auto spin
        const goldenSpinBtn = document.getElementById('goldenSpinMidas');
        const maxGoldenSpinBtn = document.getElementById('maxGoldenSpinMidas');
        if (goldenSpinBtn) goldenSpinBtn.disabled = true;
        if (maxGoldenSpinBtn) maxGoldenSpinBtn.disabled = true;
        
        this.updateAutoSpinStatus();
        this.runNextAutoSpin();
    },

    /**
     * Stop auto spinning
     */
    stopMidasAutoSpin() {
        this.midasState.autoSpinActive = false;
        this.midasState.autoSpinRemaining = 0;
        
        // Update UI
        document.getElementById('autoSpinMidas').classList.remove('active');
        document.getElementById('startAutoSpin').style.display = 'inline-block';
        document.getElementById('stopAutoSpin').style.display = 'none';
        
        // Re-enable golden spin buttons
        const goldenSpinBtn = document.getElementById('goldenSpinMidas');
        const maxGoldenSpinBtn = document.getElementById('maxGoldenSpinMidas');
        if (goldenSpinBtn) goldenSpinBtn.disabled = false;
        if (maxGoldenSpinBtn) maxGoldenSpinBtn.disabled = false;
        
        document.getElementById('autoSpinStatus').textContent = `Auto spin stopped. Total won: ${GAME.formatNumber(this.midasState.autoSpinTotalWon)}`;
    },

    /**
     * Run the next auto spin
     */
    runNextAutoSpin() {
        if (!this.midasState.autoSpinActive) return;
        
        // Check if we have spins remaining
        if (this.midasState.autoSpinRemaining === 0) {
            this.stopMidasAutoSpin();
            return;
        }
        
        // Check if we can afford the bet
        const bet = this.getBetValue('midasBet');
        if (bet > GAME.state.coins) {
            document.getElementById('autoSpinStatus').textContent = 'Not enough coins! Auto spin stopped.';
            this.stopMidasAutoSpin();
            return;
        }
        
        // Decrease remaining (unless infinite)
        if (this.midasState.autoSpinRemaining > 0) {
            this.midasState.autoSpinRemaining--;
        }
        
        this.updateAutoSpinStatus();
        
        // Start the spin (regular, not golden)
        this.spinMidas(false);
    },

    /**
     * Update auto spin status display
     */
    updateAutoSpinStatus() {
        const statusEl = document.getElementById('autoSpinStatus');
        if (!statusEl) return;
        
        if (this.midasState.autoSpinActive) {
            const remaining = this.midasState.autoSpinRemaining === -1 ? '∞' : this.midasState.autoSpinRemaining;
            const total = this.midasState.autoSpinTotal === Infinity ? '∞' : this.midasState.autoSpinTotal;
            statusEl.textContent = `Spinning... ${remaining}/${total} | Won: ${GAME.formatNumber(this.midasState.autoSpinTotalWon)}`;
        }
    },

    /**
     * Spin with max affordable golden spin bet
     */
    spinMaxGolden() {
        // Calculate max bet that we can afford for golden spin (100x multiplier)
        const maxBet = Math.floor(GAME.state.coins / 100);
        
        if (maxBet < 1) {
            const resultDiv = document.getElementById('midasResult');
            resultDiv.textContent = 'Not enough coins for Thunder Spin! Need at least 100 coins.';
            resultDiv.className = 'game-result lose';
            return;
        }
        
        // Set the bet input to max
        const betInput = document.getElementById('midasBet');
        if (betInput) {
            betInput.dataset.rawValue = this.numberToFullString(maxBet);
            betInput.value = this.formatBetDisplay(maxBet);
        }
        
        // Update cost displays
        this.updateGoldenSpinCost();
        
        // Perform the golden spin
        this.spinMidas(true);
    },

    /**
     * Calculate golden spin cost (100x current bet)
     */
    getGoldenSpinCost() {
        const bet = this.getBetValue('midasBet') || 10;
        return bet * 100;
    },

    /**
     * Update golden spin button cost display
     */
    updateGoldenSpinCost() {
        const costDisplay = document.getElementById('goldenSpinCost');
        if (costDisplay) {
            costDisplay.textContent = GAME.formatNumber(this.getGoldenSpinCost());
        }
        
        // Update max golden spin cost display
        const maxCostDisplay = document.getElementById('maxGoldenSpinCost');
        if (maxCostDisplay) {
            const maxAffordable = Math.floor(GAME.state.coins / 100);
            if (maxAffordable > 0) {
                maxCostDisplay.textContent = GAME.formatNumber(maxAffordable * 100);
            } else {
                maxCostDisplay.textContent = 'Need 100+';
            }
        }
    },

    /**
     * Get a random midas symbol based on weights
     */
    getRandomMidasSymbol() {
        const totalWeight = this.midasSymbols.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const symbolData of this.midasSymbols) {
            random -= symbolData.weight;
            if (random <= 0) return { ...symbolData };
        }
        return { ...this.midasSymbols[0] };
    },

    /**
     * Spin the Midas slot machine
     * @param {boolean} isGoldenSpin - If true, guarantees 3-5 scatters
     */
    spinMidas(isGoldenSpin = false) {
        if (this.midasState.spinning) return;
        
        const betInput = document.getElementById('midasBet');
        const resultDiv = document.getElementById('midasResult');
        const spinBtn = document.getElementById('spinMidas');
        const goldenSpinBtn = document.getElementById('goldenSpinMidas');
        const maxGoldenSpinBtn = document.getElementById('maxGoldenSpinMidas');
        const freeSpinsCounter = document.getElementById('midasFreeSpinsCounter');
        const lastWinEl = document.getElementById('midasLastWin');
        
        let bet = 0;
        
        // Check if using free spins (can't use golden spin during free spins)
        if (this.midasState.freeSpins > 0) {
            if (isGoldenSpin) {
                resultDiv.textContent = 'Cannot use Thunder Spin during Free Spins!';
                resultDiv.className = 'game-result lose';
                return;
            }
            bet = this.midasState.currentBet;
            this.midasState.freeSpins--;
            document.getElementById('midasFreeSpinsLeft').textContent = this.midasState.freeSpins;
            
            if (this.midasState.freeSpins <= 0) {
                freeSpinsCounter.style.display = 'none';
                this.midasState.stickyWilds = [];
                this.midasState.freeSpinMultiplier = 1;
            }
        } else {
            bet = this.getBetValue('midasBet');
            
            if (bet <= 0) {
                resultDiv.textContent = 'Enter a valid bet amount!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            // Calculate total cost (golden spin costs 100x bet)
            const totalCost = isGoldenSpin ? this.getGoldenSpinCost() : bet;
            
            if (totalCost > GAME.state.coins) {
                resultDiv.textContent = isGoldenSpin ? 
                    `Not enough coins for Thunder Spin! Need ${GAME.formatNumber(totalCost)}` : 
                    'Not enough coins!';
                resultDiv.className = 'game-result lose';
                return;
            }
            
            // Process bet (deducts coins, adds to jackpot pool, gives VIP XP)
            // For golden spins, we handle the cost manually since it's not a standard bet
            if (!isGoldenSpin) {
                if (!this.processCasinoBet(bet)) {
                    resultDiv.textContent = 'Bet processing failed!';
                    resultDiv.className = 'game-result lose';
                    return;
                }
            } else {
                GAME.state.coins -= totalCost;
                GAME.state.casinoTotalWagered = (GAME.state.casinoTotalWagered || 0) + totalCost;
                GAME.state.casinoGamesPlayed = (GAME.state.casinoGamesPlayed || 0) + 1;
            }
            this.midasState.currentBet = bet;
            this.midasState.multiplier = 1;
            this.midasState.isGoldenSpin = isGoldenSpin;
        }
        
        this.midasState.spinning = true;
        spinBtn.disabled = true;
        if (goldenSpinBtn) goldenSpinBtn.disabled = true;
        if (maxGoldenSpinBtn) maxGoldenSpinBtn.disabled = true;
        resultDiv.textContent = this.midasState.isGoldenSpin ? '⚡ THUNDER SPIN! ⚡' : '';
        resultDiv.className = 'game-result';
        lastWinEl.textContent = '0';
        
        // Clear previous winning highlights
        document.querySelectorAll('.midas-symbol').forEach(el => {
            el.classList.remove('winning', 'golden', 'wild', 'scatter');
        });
        
        // Get reel elements
        const reels = [];
        for (let i = 1; i <= 5; i++) {
            reels.push(document.getElementById('midasReel' + i));
        }
        
        // Start spinning animation
        reels.forEach(reel => reel.classList.add('spinning'));
        
        // For golden spin, determine scatter positions first
        let guaranteedScatters = [];
        if (this.midasState.isGoldenSpin) {
            // Guarantee 3-5 scatters (weighted towards 3)
            const scatterCount = Math.random() < 0.6 ? 3 : (Math.random() < 0.7 ? 4 : 5);
            const allPositions = [];
            for (let col = 0; col < 5; col++) {
                for (let row = 0; row < 3; row++) {
                    allPositions.push({ col, row });
                }
            }
            // Shuffle and pick scatter positions
            for (let i = allPositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
            }
            guaranteedScatters = allPositions.slice(0, scatterCount);
        }
        
        // Generate final results for each reel (5 reels x 3 rows)
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row < 3; row++) {
                // Check if this position has a sticky wild
                const isStickyWild = this.midasState.stickyWilds.some(
                    pos => pos.col === col && pos.row === row
                );
                
                // Check if this is a guaranteed scatter position
                const isGuaranteedScatter = guaranteedScatters.some(
                    pos => pos.col === col && pos.row === row
                );
                
                if (isStickyWild) {
                    this.midasState.grid[col][row] = { 
                        symbol: '👑', 
                        isWild: true, 
                        isSticky: true,
                        payouts: { 3: 5, 4: 20, 5: 100 }
                    };
                } else if (isGuaranteedScatter) {
                    this.midasState.grid[col][row] = { 
                        symbol: '⚡', 
                        isScatter: true,
                        payouts: { 3: 0, 4: 0, 5: 0 }
                    };
                } else {
                    this.midasState.grid[col][row] = this.getRandomMidasSymbol();
                }
            }
        }
        
        // Spinning animation with random symbols
        let spinCount = 0;
        const spinInterval = setInterval(() => {
            reels.forEach(reel => {
                const symbols = reel.querySelectorAll('.midas-symbol');
                symbols.forEach(sym => {
                    const randomSymbol = this.midasSymbols[Math.floor(Math.random() * this.midasSymbols.length)];
                    sym.textContent = randomSymbol.symbol;
                });
            });
            spinCount++;
            
            if (spinCount >= 15) {
                clearInterval(spinInterval);
                this.stopMidasReelsSequentially(reels, bet);
            }
        }, 80);
        
        this.updateDisplay();
    },

    /**
     * Stop reels one by one
     */
    stopMidasReelsSequentially(reels, bet) {
        let reelIndex = 0;
        
        const stopNextReel = () => {
            if (reelIndex < 5) {
                const reel = reels[reelIndex];
                reel.classList.remove('spinning');
                
                // Set final symbols for this reel
                const symbols = reel.querySelectorAll('.midas-symbol');
                symbols.forEach((sym, rowIndex) => {
                    const symbolData = this.midasState.grid[reelIndex][rowIndex];
                    sym.textContent = symbolData.symbol;
                    
                    if (symbolData.isWild) {
                        sym.classList.add('wild');
                    }
                    if (symbolData.isScatter) {
                        sym.classList.add('scatter');
                    }
                    if (symbolData.isSticky) {
                        sym.classList.add('golden');
                    }
                });
                
                reelIndex++;
                setTimeout(stopNextReel, 150);
            } else {
                // All reels stopped
                setTimeout(() => this.applyMidasGoldenTouch(bet), 300);
            }
        };
        
        stopNextReel();
    },

    /**
     * Apply Golden Touch - Wilds turn adjacent symbols golden
     */
    applyMidasGoldenTouch(bet) {
        const reels = [];
        for (let i = 1; i <= 5; i++) {
            reels.push(document.getElementById('midasReel' + i));
        }
        
        let goldenTouchBonus = 0;
        
        // Find all wild positions and apply golden touch
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row < 3; row++) {
                if (this.midasState.grid[col][row].isWild) {
                    goldenTouchBonus += 1; // Each wild adds to multiplier
                    
                    // Turn adjacent symbols golden (they act as wilds for this spin)
                    const adjacentPositions = [
                        { col: col - 1, row: row },
                        { col: col + 1, row: row },
                        { col: col, row: row - 1 },
                        { col: col, row: row + 1 }
                    ];
                    
                    adjacentPositions.forEach(pos => {
                        if (pos.col >= 0 && pos.col < 5 && pos.row >= 0 && pos.row < 3) {
                            const adjSymbol = this.midasState.grid[pos.col][pos.row];
                            if (!adjSymbol.isWild && !adjSymbol.isScatter) {
                                adjSymbol.isGolden = true;
                                const symEl = reels[pos.col].querySelectorAll('.midas-symbol')[pos.row];
                                symEl.classList.add('golden');
                            }
                        }
                    });
                    
                    // During free spins, wilds become sticky
                    if (this.midasState.freeSpins > 0 || this.midasState.freeSpinMultiplier > 1) {
                        const alreadySticky = this.midasState.stickyWilds.some(
                            pos => pos.col === col && pos.row === row
                        );
                        if (!alreadySticky) {
                            this.midasState.stickyWilds.push({ col, row });
                            this.midasState.freeSpinMultiplier += 1; // Increase multiplier
                            document.getElementById('midasFreeSpinMult').textContent = 
                                this.midasState.freeSpinMultiplier + 'x';
                        }
                    }
                }
            }
        }
        
        // Update multiplier display
        this.midasState.multiplier = 1 + (goldenTouchBonus * 0.5);
        if (this.midasState.freeSpinMultiplier > 1) {
            this.midasState.multiplier *= this.midasState.freeSpinMultiplier;
        }
        document.getElementById('midasMultiplierValue').textContent = 
            this.midasState.multiplier.toFixed(1) + 'x';
        
        // Calculate winnings
        setTimeout(() => this.calculateMidasPaylines(bet), 400);
    },

    /**
     * Calculate winnings across all paylines
     */
    calculateMidasPaylines(bet) {
        const resultDiv = document.getElementById('midasResult');
        const spinBtn = document.getElementById('spinMidas');
        const lastWinEl = document.getElementById('midasLastWin');
        const freeSpinsCounter = document.getElementById('midasFreeSpinsCounter');
        
        let totalWin = 0;
        let winningLines = 0;
        let scatterCount = 0;
        const winningPositions = new Set();
        
        // Count scatters
        for (let col = 0; col < 5; col++) {
            for (let row = 0; row < 3; row++) {
                if (this.midasState.grid[col][row].isScatter) {
                    scatterCount++;
                }
            }
        }
        
        // Check each payline
        this.midasPaylines.forEach((payline, lineIndex) => {
            const lineSymbols = payline.map((row, col) => {
                const sym = this.midasState.grid[col][row];
                return {
                    ...sym,
                    col,
                    row,
                    isWildOrGolden: sym.isWild || sym.isGolden
                };
            });
            
            // Find matching symbols from left to right
            let matchSymbol = null;
            let matchCount = 0;
            const matchPositions = [];
            let allWilds = true;
            
            for (let i = 0; i < 5; i++) {
                const sym = lineSymbols[i];
                
                if (sym.isScatter) break; // Scatters don't count in paylines
                
                if (matchSymbol === null) {
                    if (sym.isWildOrGolden) {
                        matchCount++;
                        matchPositions.push({ col: sym.col, row: sym.row });
                    } else {
                        matchSymbol = sym.symbol;
                        matchCount = 1;
                        matchPositions.push({ col: sym.col, row: sym.row });
                        allWilds = false;
                    }
                } else {
                    if (sym.isWildOrGolden || sym.symbol === matchSymbol) {
                        matchCount++;
                        matchPositions.push({ col: sym.col, row: sym.row });
                        if (!sym.isWildOrGolden) {
                            matchSymbol = sym.symbol;
                            allWilds = false;
                        }
                    } else {
                        break;
                    }
                }
            }
            
            // Calculate payout if 3+ matches
            if (matchCount >= 3) {
                let symbolData;
                if (allWilds) {
                    // All wilds - use wild symbol payouts
                    symbolData = this.midasSymbols.find(s => s.isWild);
                } else if (matchSymbol) {
                    symbolData = this.midasSymbols.find(s => s.symbol === matchSymbol);
                }
                
                if (symbolData && symbolData.payouts[matchCount]) {
                    const linePayout = symbolData.payouts[matchCount];
                    totalWin += linePayout;
                    winningLines++;
                    matchPositions.forEach(pos => {
                        winningPositions.add(`${pos.col}-${pos.row}`);
                    });
                }
            }
        });
        
        // Apply multiplier
        totalWin = Math.floor(bet * totalWin * this.midasState.multiplier);
        
        // Highlight winning positions
        const reels = [];
        for (let i = 1; i <= 5; i++) {
            reels.push(document.getElementById('midasReel' + i));
        }
        
        winningPositions.forEach(posStr => {
            const [col, row] = posStr.split('-').map(Number);
            const symEl = reels[col].querySelectorAll('.midas-symbol')[row];
            symEl.classList.add('winning');
        });
        
        // Check for free spins trigger (3+ scatters)
        let bonusFreeSpins = 0;
        if (scatterCount >= 3) {
            bonusFreeSpins = scatterCount === 3 ? 10 : (scatterCount === 4 ? 15 : 20);
            this.midasState.freeSpins += bonusFreeSpins;
            this.midasState.freeSpinMultiplier = Math.max(this.midasState.freeSpinMultiplier, 2);
            document.getElementById('midasFreeSpinsLeft').textContent = this.midasState.freeSpins;
            document.getElementById('midasFreeSpinMult').textContent = this.midasState.freeSpinMultiplier + 'x';
            freeSpinsCounter.style.display = 'block';
        }
        
        // Update results
        if (totalWin > 0 || bonusFreeSpins > 0) {
            GAME.state.coins += totalWin;
            GAME.state.casinoTotalWon = (GAME.state.casinoTotalWon || 0) + totalWin;
            if (totalWin > 0) {
                this.trackCasinoGame(bet, totalWin);
            }
            lastWinEl.textContent = GAME.formatNumber(totalWin);
            
            // Track auto spin winnings
            if (this.midasState.autoSpinActive) {
                this.midasState.autoSpinTotalWon += totalWin;
            }
            
            let message = '';
            if (totalWin > 0) {
                message = `✨ ${winningLines} winning line${winningLines > 1 ? 's' : ''}! Won ${GAME.formatNumber(totalWin)} coins!`;
                if (this.midasState.multiplier > 1) {
                    message += ` (${this.midasState.multiplier.toFixed(1)}x)`;
                }
            }
            if (bonusFreeSpins > 0) {
                message += ` 🌟 ${bonusFreeSpins} FREE SPINS with sticky wilds!`;
            }
            
            resultDiv.innerHTML = message;
            resultDiv.className = 'game-result win';
            
            // Play thunder sound for good results if not muted
            if (!this.isGameMuted('midas')) {
                this.playSound('thunder');
            }
            
            // Check auto spin stop conditions
            if (this.midasState.autoSpinActive) {
                // Stop on win threshold
                if (this.midasState.autoSpinStopOnWin > 0 && totalWin >= this.midasState.autoSpinStopOnWin) {
                    document.getElementById('autoSpinStatus').textContent = `Big win! Stopped. Won: ${GAME.formatNumber(totalWin)}`;
                    this.stopMidasAutoSpin();
                }
                // Stop on free spins
                if (this.midasState.autoSpinStopOnFreeSpins && bonusFreeSpins > 0) {
                    document.getElementById('autoSpinStatus').textContent = `Free spins triggered! Auto spin paused.`;
                    this.stopMidasAutoSpin();
                }
            }
        } else {
            this.trackCasinoGame(bet, 0);
            resultDiv.innerHTML = `No win this spin.`;
            resultDiv.className = 'game-result lose';
        }
        
        this.midasState.spinning = false;
        this.midasState.isGoldenSpin = false;
        spinBtn.disabled = false;
        
        // Only re-enable golden buttons if not auto spinning
        if (!this.midasState.autoSpinActive) {
            const goldenSpinBtnEnd = document.getElementById('goldenSpinMidas');
            if (goldenSpinBtnEnd) goldenSpinBtnEnd.disabled = false;
            const maxGoldenSpinBtnEnd = document.getElementById('maxGoldenSpinMidas');
            if (maxGoldenSpinBtnEnd) maxGoldenSpinBtnEnd.disabled = false;
        }
        
        // Update max golden spin cost after coins changed
        this.updateGoldenSpinCost();
        
        this.updateCasinoStats();
        this.updateDisplay();
        GAME.saveGame();
        
        // Continue auto spin after a short delay
        if (this.midasState.autoSpinActive && this.midasState.freeSpins <= 0) {
            this.updateAutoSpinStatus();
            setTimeout(() => this.runNextAutoSpin(), 800);
        } else if (this.midasState.autoSpinActive && this.midasState.freeSpins > 0) {
            // During free spins, continue spinning automatically
            this.updateAutoSpinStatus();
            setTimeout(() => this.spinMidas(false), 800);
        }
    },

    /**
     * Update all display elements
     */
    updateDisplay() {
        // UI.updateDisplay start; removed noisy coin log
        try {
            const activeTab = document.querySelector('.tab-content.active');
            const visible = activeTab ? window.getComputedStyle(activeTab).display !== 'none' : 'no active tab';
            // UI.updateDisplay activeTab visibility log removed to reduce noise
        } catch(e) { console.warn('UI.updateDisplay: activeTab check failed', e); }
        // Update header stats
        (function() {
            const balanceEl = document.getElementById('balanceDisplay');
            if (!balanceEl) { console.warn('UI.updateDisplay: balanceDisplay not found'); return; }
            const coins = Number(GAME.state.coins);
            balanceEl.textContent = GAME.formatNumber(Number.isFinite(coins) ? coins : 0);
        })();
        (function(){ const el = document.getElementById('epsDisplay'); if (!el) { console.warn('UI.updateDisplay: epsDisplay not found'); return; } el.textContent = GAME.formatHashRate(GAME.getHashRate()); })();
        
        // Update floating balance display
        const floatingDisplay = document.getElementById('floatingBalanceDisplay');
        if (floatingDisplay) {
            floatingDisplay.textContent = GAME.formatNumber(GAME.state.coins);
        }
        
        // Power production with fluctuation display
        const powerProduction = GAME.formatPower(GAME.getPowerGeneration());
        const fluctuation = GAME.getPowerFluctuation();
        const fluctuationText = fluctuation > 0 ? `+${fluctuation.toFixed(1)}%` : `${fluctuation.toFixed(1)}%`;
        const powerColor = fluctuation > 0 ? '#2ecc71' : '#ff6b6b';
        const powerDisplay = document.getElementById('powerOutputDisplay');
        if (powerDisplay) { powerDisplay.textContent = powerProduction + ' ' + fluctuationText; powerDisplay.style.color = powerColor; }
        
        (function(){ const el = document.getElementById('powerDrawDisplay'); if (el) el.textContent = GAME.formatPower(GAME.getTotalPowerUsage()); })();
        
        // Update battery display with charge/discharge rate
        const batteryDisplay = document.getElementById('batteryDisplay');
        if (batteryDisplay) {
            const powerGen = GAME.getPowerGeneration();
            const powerUsage = GAME.getTotalPowerUsage();
            const excessPower = powerGen - powerUsage;
            
            let rateHTML = `${GAME.formatNumber(GAME.state.batteryStored)} / ${GAME.formatNumber(GAME.state.batteryCapacity)} W<br>`;
            
            if (excessPower > 0) {
                // Charging
                const chargeAmount = Math.min(excessPower, GAME.state.batteryChargeRate);
                rateHTML += `<span style="color: #2ecc71;">+${GAME.formatNumber(chargeAmount)} W/s</span>`;
            } else if (excessPower < 0) {
                // Discharging
                const dischargeAmount = Math.min(-excessPower, GAME.state.batteryDischargeRate);
                rateHTML += `<span style="color: #ff4444;">-${GAME.formatNumber(dischargeAmount)} W/s</span>`;
            }
            
            batteryDisplay.innerHTML = rateHTML;
        }
        
        (function(){
            const sp = document.getElementById('skillPointsHeaderDisplay'); if (sp) sp.textContent = GAME.state.skillPoints || 0;
            const pd = document.getElementById('prestigeDisplay'); if (pd) pd.textContent = GAME.state.prestigePoints || 0;
            const pl = document.getElementById('prestigeLevelHeader'); if (pl) pl.textContent = GAME.state.prestigeLevel || 0;
        })();
        
        // Update skill tree points display
        this.updateSkillPointsDisplay();

        // Check if power is insufficient and show warning
        const powerWarning = document.getElementById('powerWarning');
        const powerGen = GAME.getPowerGeneration();
        const powerUsage = GAME.getTotalPowerUsage();
        
        // Check if approaching power limit (85% or more)
        const powerUsagePercentage = (powerUsage / powerGen) * 100;
        
        try {
            if (powerGen < powerUsage) {
            // Not enough power
            powerWarning.textContent = '⚠️ NOT ENOUGH POWER OFFLINE';
            powerWarning.className = 'power-warning offline';
            powerWarning.style.display = 'block';
            } else if (powerUsagePercentage >= 85) {
            // Approaching limit
            powerWarning.textContent = '⚠️ System overload imminent';
            powerWarning.className = 'power-warning overload';
            powerWarning.style.display = 'block';
            } else if (powerGen > 0) {
            // Enough power
            powerWarning.textContent = '✓ ONLINE';
            powerWarning.className = 'power-warning online';
            powerWarning.style.display = 'block';
        } else {
            powerWarning.style.display = 'none';
            }
        } catch(e) { console.warn('UI.updateDisplay: powerWarning update error', e); }

        const G = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
        // Update clicker tab
        try { const clickEl = document.getElementById('clickValue'); if (clickEl) clickEl.textContent = '+' + G.formatNumber(G.getClickPower()); } catch(e) { console.warn('UI.updateDisplay: clickValue update failed', e); }
        this.updateClickUpgrades();

        // Update servers tab
        try { this.updateServersDisplay(); } catch(e) { console.warn('updateServersDisplay failed', e); }
        
        // Update worker button states in rack
        try { this.updateRackWorkerButtons(); } catch (e) { console.warn('updateRackWorkerButtons failed', e); }

        // Update power tab
        try { this.updatePowerDisplay(); } catch (e) { console.warn('updatePowerDisplay failed', e); }

        // Update battery tab
        try { this.updateBatteryDisplay(); } catch (e) { console.warn('updateBatteryDisplay failed', e); }
        
        // Update mines tab
        try { this.updateMinesDisplay(); } catch (e) { console.warn('updateMinesDisplay failed', e); }

        // Update material inventory counts (include steel and sum mined stored amounts)
        try {
            const mats = ['lithium','galliumNitride','siliconCarbide','iron','copper','gold','platinium','lerasium','atium','harmonium','antimatium','darkium','steel'];
            mats.forEach(m => {
                try {
                    const el = document.getElementById(m + 'Count');
                    if (!el) return;
                    const matInv = (GAME.state && GAME.state.materials && GAME.state.materials[m]) ? Math.floor(GAME.state.materials[m]) : 0;
                    const mineStored = (GAME.state && GAME.state.mines && GAME.state.mines[m] && typeof GAME.state.mines[m].stored !== 'undefined') ? Math.floor(GAME.state.mines[m].stored) : 0;
                    el.textContent = matInv + mineStored;
                } catch (e) { /* ignore per-material errors */ }
            });
        } catch (e) { console.warn('material counts update failed', e); }

        // Update research info
        document.getElementById('skillPointsDisplay').textContent = G.state.skillPoints;
        
        // Update locked tabs
        this.updateLockedTabs();

        // Update prestige info
        document.getElementById('prestigeCurrentCoins').textContent = G.formatNumber(G.state.coins);
        document.getElementById('prestigePointsGained').textContent = G.calculatePrestigeGain ? G.calculatePrestigeGain() : '0';

        // Live update of fighting UI while open
        try {
            const fightingContainer = document.getElementById('fightingGrid');
            if (fightingContainer) {
                // Update stamina bar if present
                const staminaFill = document.getElementById('fightingStaminaFill');
                const staminaText = document.getElementById('fightingStaminaText');
                if (staminaFill && staminaText) {
                    const cur = (G.state.fightingStamina || 0);
                    const max = Math.max(0, (G.state.fightingStaminaMax || 0));
                    const pct = max === 0 ? 0 : Math.min(100, (cur / max) * 100);
                    staminaFill.style.width = pct + '%';
                    staminaText.textContent = `${cur.toFixed(1)}/${max.toFixed(0)} (+${G.state.fightingStaminaRegen || 0}/s)`;
                }

                // Update attack buttons (cooldown + disabled based on stamina)
                const attackBtns = fightingContainer.querySelectorAll('.attack-button');
                attackBtns.forEach(btn => {
                    const attackId = btn.dataset.attack;
                    const attackCfg = G.CONFIG.FIGHTING_ATTACKS.find(a => a.id === attackId);
                    const staminaCost = parseInt(btn.dataset.stamina || (attackCfg && attackCfg.staminaCost) || 0);
                    let isUnlocked = true;
                    if (G.isAttackUnlocked && typeof G.isAttackUnlocked === 'function') {
                        try { isUnlocked = G.isAttackUnlocked(attackId); } catch (e) { console.log('isAttackUnlocked error', e); }
                    }

                    let isOnCooldown = false;
                    let cooldownLeft = 0;
                    if (G.state.currentBattle && Array.isArray(G.state.currentBattle.attacksUsed)) {
                        const last = G.state.currentBattle.attacksUsed.find(a => a.id === attackId);
                        if (last && attackCfg) {
                            cooldownLeft = Math.max(0, attackCfg.cooldown - (Date.now() - last.time));
                            isOnCooldown = cooldownLeft > 0;
                        }
                    }

                    const hasStamina = (G.state.fightingStamina || 0) >= staminaCost;
                    // Disable when not player's turn in turn-based combat
                    const isPlayersTurn = !(G.state.currentBattle && G.state.currentBattle.turn && G.state.currentBattle.turn !== 'player');
                    btn.disabled = (!isUnlocked || isOnCooldown || !hasStamina || !isPlayersTurn);

                    // Update cooldown text if element present
                    const cooldownEl = btn.querySelector('.attack-cooldown');
                    if (cooldownEl) {
                        cooldownEl.textContent = `⏰ ${Math.ceil(cooldownLeft / 1000)}s`;
                    }
                });

                // Update training unlock buttons if present
                const trainingCards = fightingContainer.querySelectorAll('.training-card');
                if (trainingCards && trainingCards.length > 0) {
                    trainingCards.forEach(card => {
                        const attackId = card.dataset.attack;
                        const btn = card.querySelector('.attack-unlock-btn');
                        if (!btn) return;
                        const runtime = (typeof window !== 'undefined' && window.GAME) ? window.GAME : GAME;
                        const cost = (runtime && typeof runtime.getAttackUnlockCost === 'function') ? runtime.getAttackUnlockCost(attackId) : (GAME.getAttackUnlockCost ? GAME.getAttackUnlockCost(attackId) : 3);
                        const canAfford = (runtime && runtime.state && (runtime.state.skillPoints || 0) >= cost);
                        btn.disabled = !canAfford;
                        btn.textContent = `Unlock (${cost} SP)`;
                    });
                }

                // Update training upgrades and forge/inventory UI if present
                const trainingSide = fightingContainer.querySelector('.training-side');
                if (trainingSide) {
                    // Upgrades
                    const upgCards = trainingSide.querySelectorAll('.fighting-upgrade-card');
                    upgCards.forEach(card => {
                        const key = card.dataset.upgrade;
                        const lvl = (G.getFightingUpgradeLevel && typeof G.getFightingUpgradeLevel === 'function') ? G.getFightingUpgradeLevel(key) : (G.state.fightingUpgrades && G.state.fightingUpgrades[key] ? G.state.fightingUpgrades[key].level : 0);
                        const cost = (G.getFightingUpgradeCost && typeof G.getFightingUpgradeCost === 'function') ? G.getFightingUpgradeCost(key) : 0;
                        const nameEl = card.querySelector('.upg-name');
                        if (nameEl) nameEl.textContent = `${G.CONFIG.FIGHTING_UPGRADES[key].name} (Lv ${lvl})`;
                        const buyBtn = card.querySelector('.upg-buy');
                        if (buyBtn) {
                            buyBtn.textContent = `💰 ${G.formatNumber(cost)}`;
                            buyBtn.disabled = !(G.state.coins >= cost);
                        }
                    });

                    // Forge & inventory UI — render inventory if present
                    const invGrid = trainingSide.querySelector('#forgeInventoryGrid');
                    if (invGrid && typeof this.renderForgeInventory === 'function') {
                        this.renderForgeInventory();
                    }
                }
            }
        } catch (e) {
            // avoid breaking UI updates
        }

        // Update active battle if any
        if (G.state.currentBattle) {
            if (G.checkBattleEnd && typeof G.checkBattleEnd === 'function') G.checkBattleEnd();
            if (G.updateBattleUI && typeof G.updateBattleUI === 'function') G.updateBattleUI();
        }
    },

    /**
     * Update click upgrades display
     */
    updateClickUpgrades() {
        // Only update values if cards already exist, don't regenerate
        for (const [key, config] of Object.entries(GAME.CONFIG.CLICK_UPGRADES)) {
            const upgrade = GAME.state.clickUpgrades[key];
            const cost = GAME.getClickUpgradeCost(key);
            const canAfford = GAME.state.coins >= cost;
            
            const card = document.getElementById(`upgrade-card-${key}`);
            if (!card) {
                // First time - create the card
                this.createUpgradeCard(key, config);
            } else {
                // Update existing card values only
                const levelSpan = card.querySelector('.upgrade-stats .stat:first-child span');
                const costSpan = card.querySelector('.upgrade-stats .stat:last-child span');
                const button = card.querySelector('button');
                
                if (levelSpan) levelSpan.textContent = upgrade.level;
                if (costSpan) costSpan.textContent = GAME.formatNumber(cost);
                if (button) button.disabled = !canAfford;
            }
        }
    },

    /**
     * Create a single upgrade card
     */
    createUpgradeCard(key, config) {
        const container = document.getElementById('clickUpgrades');
        const upgrade = GAME.state.clickUpgrades[key];
        const cost = GAME.getClickUpgradeCost(key);
        const canAfford = GAME.state.coins >= cost;
        const buyAmountText = this.buyAmount === 'max' ? 'MAX' : `x${this.buyAmount}`;

        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.id = `upgrade-card-${key}`;
        card.innerHTML = `
            <h3>${config.name}</h3>
            <p class="upgrade-desc">${config.description}</p>
            <div class="upgrade-stats">
                <div class="stat">Level: <span>${upgrade.level}</span></div>
                <div class="stat">Cost: <span>${GAME.formatNumber(cost)}</span></div>
            </div>
            <button class="upgrade-button" data-upgrade="${key}" ${!canAfford ? 'disabled' : ''}>
                Buy ${buyAmountText}
            </button>
        `;

        card.querySelector(`[data-upgrade="${key}"]`).addEventListener('click', (e) => {
            e.preventDefault();
            
            let purchaseCount = 0;
            const targetAmount = this.buyAmount === 'max' ? 1000 : this.buyAmount;
            
            for (let i = 0; i < targetAmount; i++) {
                if (GAME.buyClickUpgrade(key)) {
                    purchaseCount++;
                } else {
                    break;
                }
            }
            
            if (purchaseCount > 0) {
                GAME.saveGame();
                document.getElementById('balanceDisplay').textContent = GAME.formatNumber(GAME.state.coins);
                document.getElementById('clickValue').textContent = '+' + GAME.formatNumber(GAME.getClickPower());
            }
        });

        container.appendChild(card);
    },

    /**
     * Update servers display
     */
    updateServersDisplay() {
        try { console.log('UI.updateServersDisplay: refreshing server counts'); } catch(e) {}
        for (const [key, config] of Object.entries(GAME.CONFIG.SERVERS)) {
            const serverData = (GAME.state && GAME.state.servers) ? GAME.state.servers[key] : undefined;
            const cost = (() => { try { return GAME.getServerCost(key); } catch(e) { return 0; } })();
            const canAfford = (GAME.state && typeof GAME.state.coins === 'number') ? GAME.state.coins >= cost : false;

            // Update count (show total owned = inventory count + placed servers)
            const countElement = document.querySelector(`.server-count-${key}`);
            if (countElement) {
                try {
                    let inventoryCount = (serverData && typeof serverData.count !== 'undefined') ? serverData.count : 0;
                    let placedCount = 0;
                    try {
                        const buildings = (GAME.state && GAME.state.buildings) ? GAME.state.buildings : {};
                        for (const [bId, b] of Object.entries(buildings)) {
                            const placed = (b && Array.isArray(b.placedServers)) ? b.placedServers : [];
                            for (const s of placed) {
                                if (s && s.type === key) placedCount++;
                            }
                        }
                    } catch (e) { placedCount = 0; }
                    const total = (Number(inventoryCount) || 0) + (Number(placedCount) || 0);
                    countElement.textContent = total;
                } catch(e) { countElement.textContent = 0; }
            }

            // Debug: log DOM value after update for troubleshooting
            try {
                const domVal = countElement ? countElement.textContent : null;
                if (domVal !== null) console.log('UI.updateServersDisplay: DOM count for', key, '->', domVal);
            } catch(e) {}

            // Update hash rate
            const hashrateElement = document.querySelector(`.server-hashrate-${key}`);
            if (hashrateElement) {
                const config = GAME.CONFIG.SERVERS[key];
                let totalHashRate = 0;
                try {
                    // Calculate hash rate from all placed servers of this type (including worker bonuses)
                    const buildings = (GAME.state && GAME.state.buildings) ? GAME.state.buildings : {};
                    for (const [buildingId, building] of Object.entries(buildings)) {
                        const placed = (building && Array.isArray(building.placedServers)) ? building.placedServers : [];
                        for (const server of placed) {
                            if (server && server.type === key) {
                                const workerMultiplier = server.hasWorker ? 1.5 : 1.0;
                                totalHashRate += (config && config.baseHashRate) ? config.baseHashRate * workerMultiplier : 0;
                            }
                        }
                    }
                } catch(e) { totalHashRate = 0; }
                
                // Apply prestige multiplier
                const miningMultiplier = 1 + (GAME.state.prestigePoints * 0.02);
                totalHashRate *= miningMultiplier;
                
                hashrateElement.textContent = GAME.formatHashRate(totalHashRate);
            }

            // Update cost
            const costElement = document.querySelector(`.server-cost-${key}`);
            if (costElement) {
                costElement.textContent = GAME.formatNumber(cost);
            }

            // Update button states using IDs
            const buyButton = document.getElementById(`buy-btn-${key}`);
            const buyTenButton = document.getElementById(`buy-ten-btn-${key}`);
            const costTen = cost * 10;
            
            if (buyButton) {
                buyButton.disabled = !canAfford;
                buyButton.textContent = `Place in Rack (${GAME.formatNumber(cost)})`;
            }
            if (buyTenButton) {
                buyTenButton.disabled = GAME.state.coins < costTen;
                buyTenButton.textContent = `Place in Rack (${GAME.formatNumber(costTen)})`;
            }
            
            // Update materials display
            if (config.materialCost) {
                const materialsEl = document.getElementById(`materials-${key}`);
                if (materialsEl) {
                    materialsEl.innerHTML = `<span class="materials-label">Materials:</span> ${this.getMaterialRequirementsText(key)}`;
                }
                
                // Update button disabled state based on materials too
                if (buyButton) {
                    const hasMaterials = this.hasEnoughMaterials(key);
                    const available = GAME.getAvailableRackUnits();
                    const required = config.rackUnits;
                    buyButton.disabled = !canAfford || !hasMaterials || available < required;
                }
            }
        }
        
        // Quick update balance and production display
        document.getElementById('balanceDisplay').textContent = GAME.formatNumber(GAME.state.coins);
        document.getElementById('epsDisplay').textContent = GAME.formatHashRate(GAME.getHashRate());
        
        // Update mining progress bars only (more efficient than full re-render)
        this.updateMiningProgressBars();
        
        // Update worker button state
        this.updateWorkerButtonState();
        
        // Update buy building button state
        const buyBtn = document.getElementById('buyBuildingBtn');
        if (buyBtn) {
            const buildings = GAME.getBuildings();
            const numBuildings = buildings.length;
            const maxBuildings = GAME.CONFIG.BUILDING_PURCHASE.maxBuildings;
            
            if (numBuildings >= maxBuildings) {
                buyBtn.disabled = true;
                buyBtn.innerHTML = 'Max Buildings Reached';
            } else {
                const cost = GAME.getBuildingPurchaseCost();
                const canAfford = GAME.state.coins >= cost;
                buyBtn.disabled = !canAfford;
                buyBtn.innerHTML = `Buy Building (${GAME.formatNumber(cost)})`;
            }
        }
    },

    /**
     * Update worker button state based on affordability
     */
    updateWorkerButtonState() {
        const building = GAME.getCurrentBuilding();
        if (!building) return;
        
        const workerBtn = document.getElementById(`worker-buy-btn-${building.id}`);
        if (workerBtn) {
            const workerCost = GAME.getWorkerCost(building.id);
            const canAfford = GAME.state.coins >= workerCost;
            workerBtn.style.opacity = canAfford ? '1' : '0.5';
        }
    },

    /**
     * Update all worker button states in the rack
     */
    updateRackWorkerButtons() {
        const building = GAME.getCurrentBuilding();
        if (!building) return;
        
        for (const server of building.placedServers) {
            const workerBtn = document.querySelector(`[data-server-id="${server.serverId}"].worker-btn`);
            if (workerBtn) {
                const workerCost = GAME.getWorkerCost(server.serverId);
                const canAfford = GAME.state.coins >= workerCost && !server.hasWorker;
                workerBtn.style.opacity = canAfford ? '1' : '0.5';
                workerBtn.disabled = server.hasWorker;
            }
        }
    },

    /**
     * Update only the mining progress bars without re-rendering entire rack
     */
    updateMiningProgressBars() {
        const building = GAME.getCurrentBuilding();
        if (!building) return;
        
        const isPowerCritical = GAME.isPowerCritical() || GAME.isRackPoweredDown();
        
        for (const server of building.placedServers) {
            const serverElement = document.querySelector(`[data-server-id="${server.serverId}"]`);
            const miningProgress = Math.round(server.miningProgress || 0);
            const progressFill = document.querySelector(`[data-server-id="${server.serverId}"] .mining-progress-fill`);
            const progressPercent = document.querySelector(`[data-server-id="${server.serverId}"] .mining-percentage`);
            const miningText = document.querySelector(`[data-server-id="${server.serverId}"] .mining-text`);
            
            // Update server element opacity based on power status
            if (serverElement) {
                if (isPowerCritical) {
                    serverElement.style.opacity = '0.5';
                    serverElement.style.filter = 'grayscale(0.8)';
                } else {
                    serverElement.style.opacity = '1';
                    serverElement.style.filter = 'none';
                }
            }
            
            if (progressFill) {
                progressFill.style.width = `${miningProgress}%`;
                // Update progress bar color based on current block rarity
                const blockRarity = server.currentBlock?.rarity;
                if (blockRarity) {
                    progressFill.style.backgroundColor = blockRarity.color || '#888888';
                }
            }
            if (progressPercent) {
                progressPercent.textContent = `${miningProgress}%`;
            }
            
            // Update mining text with current block info
            if (miningText) {
                const blockRarity = server.currentBlock?.rarity || GAME.CONFIG.LUCKY_BLOCKS.common;
                const blockName = server.currentBlock?.name || GAME.generateBlockName();
                const blockIcon = blockRarity.icon || '⬜';
                const blockColor = blockRarity.color || '#888888';
                
                miningText.innerHTML = `${blockIcon} ${blockRarity.name}: ${blockName}`;
                miningText.style.color = blockColor;
            }
            
            // Update activity LEDs based on power status
            const rxLed = serverElement?.querySelector('.rx-led');
            const txLed = serverElement?.querySelector('.tx-led');
            
            if (rxLed && txLed) {
                if (isPowerCritical) {
                    // Power is down - disable LED blinking
                    rxLed.style.opacity = '0.1';
                    txLed.style.opacity = '0.1';
                } else {
                    // Power is on - update LED blinking
                    const now = Date.now();
                    const rxInterval = parseInt(rxLed.dataset.blinkInterval || 150);
                    const txInterval = parseInt(txLed.dataset.blinkInterval || 200);
                    
                    if (now - parseInt(rxLed.dataset.lastBlink || 0) > rxInterval) {
                        rxLed.style.opacity = Math.random() > 0.7 ? '1' : '0.3';
                        rxLed.dataset.lastBlink = now;
                    }
                    
                    if (now - parseInt(txLed.dataset.lastBlink || 0) > txInterval) {
                        txLed.style.opacity = Math.random() > 0.6 ? '1' : '0.3';
                        txLed.dataset.lastBlink = now;
                    }
                }
            }
        }
    },

    /**
     * Update power display
     */
    updatePowerDisplay() {
        const generated = GAME.getPowerGeneration();
        const used = GAME.getTotalPowerUsage();
        const maxSlots = GAME.getMaxGridSlots();
        const available = maxSlots - GAME.state.powerGenerators.length;
        const isCritical = GAME.isPowerCritical();

        document.getElementById('powerGenerated').textContent = GAME.formatNumber(generated);
        document.getElementById('powerUsed').textContent = GAME.formatNumber(used);
        document.getElementById('availableSlots').textContent = available;

        // Update power status styling
        const powerStats = document.querySelector('.power-stats');
        const powerInfo = document.querySelector('.power-info');
        if (isCritical) {
            powerStats.style.borderColor = '#ff4444';
            powerInfo.style.borderColor = '#ff4444';
            powerInfo.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
        } else {
            powerStats.style.borderColor = 'var(--border-color)';
            powerInfo.style.borderColor = 'var(--border-color)';
            powerInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        }

        // Update PWR LED color based on power status
        const pwrLed = document.getElementById('rack-led-0');
        if (pwrLed) {
            if (isCritical || GAME.isRackPoweredDown()) {
                pwrLed.className = 'rack-led off red-led';
            } else {
                pwrLed.className = 'rack-led on green-led';
            }
        }

        // Update wattage display
        const wattageDisplay = document.getElementById('rackWattageDisplay');
        if (wattageDisplay) {
            const wattage = GAME.getRackWattage();
            wattageDisplay.textContent = GAME.formatNumber(wattage) + 'W';
        }

        // Update power down button text
        const powerDownBtn = document.getElementById('powerDownBtn');
        if (powerDownBtn) {
            const isDown = GAME.isRackPoweredDown();
            powerDownBtn.textContent = isDown ? 'Power Up' : 'Power Down';
            powerDownBtn.style.backgroundColor = isDown ? '#4CAF50' : '#ff4444';
            powerDownBtn.style.color = 'white';
        }

        // Update generator buttons
        const genButtons = document.querySelectorAll('.generator-button');
        genButtons.forEach(button => {
            const name = button.textContent.split('\n')[1].trim();
            for (const [key, config] of Object.entries(GAME.CONFIG.GENERATORS)) {
                if (config.name === name) {
                    const cost = config.cost;
                    button.disabled = GAME.state.coins < cost || available === 0;
                }
            }
        });

        // Update grid slot upgrade button if present (live update)
        try {
            const gridBtn = document.querySelector('.grid-upgrade-btn');
            if (gridBtn) {
                if (maxSlots >= 25) {
                    gridBtn.remove();
                } else {
                    const cost = GAME.getGridSlotUpgradeCost();
                    const costEl = gridBtn.querySelector('.gen-cost');
                    const powerEl = gridBtn.querySelector('.gen-power');
                    if (costEl) costEl.textContent = GAME.formatNumber(cost);
                    if (powerEl) powerEl.textContent = `${maxSlots}/${25}`;
                    gridBtn.style.opacity = (GAME.state.coins >= cost) ? '1' : '0.5';
                }
            }
        } catch (e) { /* ignore UI update errors */ }

        this.renderPowerGrid();
    },

    /**
     * Create coin particle effect
     */
    createCoinParticle(amount) {
        const container = document.getElementById('particleContainer');
        const coin = document.getElementById('clickCoin');
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.textContent = '+' + GAME.formatNumber(amount);
        
        // Get coin position
        const coinRect = coin.getBoundingClientRect();
        const coinCenterX = coinRect.left + coinRect.width / 2;
        const coinCenterY = coinRect.top + coinRect.height / 2;
        
        const randomX = Math.random() * 100 - 50;
        const randomY = Math.random() * 40 - 20;

        particle.style.left = (coinCenterX + randomX) + 'px';
        particle.style.top = (coinCenterY - 50 + randomY) + 'px';

        container.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 1000);
    },

    /**
     * Show a general notification message
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-text">${message}</span>
        `;
        document.body.appendChild(notification);

        // Play appropriate sound
        if (type === 'success') this.playSound('notification');
        else if (type === 'error') this.playSound('error');

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Show achievement notification
     */
    showAchievementNotification(name) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <span class="notification-icon">🏆</span>
            <span class="notification-text">Achievement Unlocked: ${name}</span>
        `;
        document.body.appendChild(notification);

        // Play achievement sound
        this.playSound('achievement');

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Refresh achievements tab if visible
        this.setupAchievementsTab();
    },

    /**
     * Show a general unlock notification (for bonuses, rewards, etc.)
     */
    showAchievementUnlock(options) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <span class="notification-icon">${options.icon || '🎉'}</span>
            <span class="notification-text">${options.name}</span>
        `;
        document.body.appendChild(notification);

        // Play achievement sound
        this.playSound('achievement');

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Audio context for sound effects
     */
    audioContext: null,
    masterVolume: 0.3,
    soundEnabled: true,

    /**
     * Initialize audio context (must be called after user interaction)
     */
    initAudio() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.log('Web Audio API not supported');
            }
        }
        return this.audioContext;
    },

    // Sound cooldown tracking to prevent overlapping sounds
    soundCooldowns: {},
    soundCooldownTimes: {
        click: 50,
        upgrade: 150,
        coin: 100,
        win: 300,
        lose: 300,
        jackpot: 500,
        achievement: 500,
        levelup: 500,
        prestige: 500,
        spin: 200,
        deal: 100,
        error: 200,
        notification: 300
    },

    /**
     * Play sound effect using Web Audio API (with cooldown to prevent overlap)
     */
    playSound(type) {
        // Check if sound is enabled in settings
        if (!this.soundEnabled) return;
        
        // Check cooldown to prevent sound overlap
        const now = Date.now();
        const cooldownTime = this.soundCooldownTimes[type] || 100;
        
        if (this.soundCooldowns[type] && (now - this.soundCooldowns[type]) < cooldownTime) {
            return; // Skip if sound was played too recently
        }
        this.soundCooldowns[type] = now;
        
        const ctx = this.initAudio();
        if (!ctx) return;
        
        // Resume context if suspended (browsers require user interaction)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        try {
            switch(type) {
                case 'click':
                    this.playClickSound(ctx);
                    break;
                case 'upgrade':
                    this.playUpgradeSound(ctx);
                    break;
                case 'coin':
                    this.playCoinSound(ctx);
                    break;
                case 'win':
                    this.playWinSound(ctx);
                    break;
                case 'lose':
                    this.playLoseSound(ctx);
                    break;
                case 'jackpot':
                    this.playJackpotSound(ctx);
                    break;
                case 'achievement':
                    this.playAchievementSound(ctx);
                    break;
                case 'levelup':
                    this.playLevelUpSound(ctx);
                    break;
                case 'prestige':
                    this.playPrestigeSound(ctx);
                    break;
                case 'spin':
                    this.playSpinSound(ctx);
                    break;
                case 'deal':
                    this.playDealSound(ctx);
                    break;
                case 'error':
                    this.playErrorSound(ctx);
                    break;
                case 'notification':
                    this.playNotificationSound(ctx);
                    break;
                case 'warning':
                    this.playWarningSound(ctx);
                    break;
                case 'battle':
                    this.playBattleSound(ctx);
                    break;
                case 'coinflip_spin':
                    this.playCoinFlipSound(ctx);
                    break;
                case 'dice_roll':
                    this.playDiceRollSound(ctx);
                    break;
                case 'slots_spin':
                    this.playSlotsSpinSound(ctx);
                    break;
                case 'blackjack_deal':
                    this.playBlackjackDealSound(ctx);
                    break;
                case 'wheel_spin':
                    this.playWheelSpinSound(ctx);
                    break;
                case 'plinko_drop':
                    this.playPlinkoDropSound(ctx);
                    break;
                case 'mines_reveal':
                    this.playMinesRevealSound(ctx);
                    break;
                case 'crash_launch':
                    this.playCrashLaunchSound(ctx);
                    break;
                case 'dragon_awaken':
                    this.playDragonAwakenSound(ctx);
                    break;
                // Player & mech combat sounds
                case 'player_strike':
                    this.playPlayerStrikeSound(ctx);
                    break;
                case 'player_shoot':
                    this.playPlayerShootSound(ctx);
                    break;
                case 'player_unarmed':
                    this.playPlayerUnarmedSound(ctx);
                    break;
                case 'mech_attack':
                    this.playMechAttackSound(ctx);
                    break;
                case 'mech_ambient':
                    this.playMechAmbientSound(ctx);
                    break;
                case 'mech_intro':
                    this.playMechIntroSound(ctx);
                    break;
                case 'cosmic_explore':
                    this.playCosmicExploreSound(ctx);
                    break;
                case 'thunder':
                    this.playThunderSound(ctx);
                    break;
                case 'candy_cascade':
                    this.playCandyCascadeSound(ctx);
                    break;
                case 'poker_deal':
                    this.playPokerDealSound(ctx);
                    break;
            }
        } catch (e) {
            // Silently fail if audio doesn't work
        }
    },

    /**
     * Create an oscillator with envelope
     */
    createOscillator(ctx, type, frequency, duration, volume = 0.3) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume * this.masterVolume, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
        
        return { osc, gain };
    },

    /**
     * Click sound - short click/tap
     */
    playClickSound(ctx) {
        this.createOscillator(ctx, 'sine', 800, 0.05, 0.2);
        this.createOscillator(ctx, 'sine', 600, 0.03, 0.1);
    },

    /**
     * Coin collect sound - cheerful ding
     */
    playCoinSound(ctx) {
        this.createOscillator(ctx, 'sine', 880, 0.1, 0.2);
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 1100, 0.15, 0.15);
        }, 50);
    },

    /**
     * Upgrade sound - ascending tones
     */
    playUpgradeSound(ctx) {
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(ctx, 'sine', freq, 0.15, 0.2);
            }, i * 80);
        });
    },

    /**
     * Win sound - happy ascending melody
     */
    playWinSound(ctx) {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(ctx, 'sine', freq, 0.2, 0.25);
                this.createOscillator(ctx, 'triangle', freq * 2, 0.15, 0.1);
            }, i * 100);
        });
    },

    /**
     * Lose sound - descending sad tones
     */
    playLoseSound(ctx) {
        const notes = [400, 350, 300, 250];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(ctx, 'sawtooth', freq, 0.2, 0.15);
            }, i * 120);
        });
    },

    /**
     * Jackpot sound - epic fanfare!
     */
    playJackpotSound(ctx) {
        // First chord
        [523, 659, 784].forEach(freq => {
            this.createOscillator(ctx, 'sine', freq, 0.3, 0.2);
        });
        
        // Rising arpeggio
        const notes = [784, 880, 988, 1047, 1175, 1319, 1568];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(ctx, 'sine', freq, 0.2, 0.25);
                this.createOscillator(ctx, 'triangle', freq / 2, 0.25, 0.1);
            }, 200 + i * 80);
        });
        
        // Final chord
        setTimeout(() => {
            [1047, 1319, 1568, 2093].forEach(freq => {
                this.createOscillator(ctx, 'sine', freq, 0.5, 0.2);
            });
        }, 800);
    },

    /**
     * Achievement sound - triumphant fanfare
     */
    playAchievementSound(ctx) {
        const melody = [659, 784, 880, 1047];
        melody.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(ctx, 'sine', freq, 0.25, 0.25);
                this.createOscillator(ctx, 'triangle', freq * 1.5, 0.2, 0.1);
            }, i * 120);
        });
    },

    /**
     * Level up sound - power up effect
     */
    playLevelUpSound(ctx) {
        // Sweeping frequency
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.3 * this.masterVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        
        // Add sparkle
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 1500, 0.1, 0.15);
            this.createOscillator(ctx, 'sine', 2000, 0.1, 0.1);
        }, 200);
    },

    /**
     * Prestige sound - epic transformation
     */
    playPrestigeSound(ctx) {
        // Deep rumble
        this.createOscillator(ctx, 'sawtooth', 80, 0.5, 0.3);
        
        // Rising sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.8);
        
        gain.gain.setValueAtTime(0.2 * this.masterVolume, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4 * this.masterVolume, ctx.currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1);
        
        // Final chord
        setTimeout(() => {
            [523, 659, 784, 1047].forEach(freq => {
                this.createOscillator(ctx, 'sine', freq, 0.6, 0.2);
            });
        }, 600);
    },

    /**
     * Spin sound - slot machine spinning
     */
    playSpinSound(ctx) {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createOscillator(ctx, 'square', 300 + Math.random() * 200, 0.05, 0.1);
            }, i * 50);
        }
    },

    /**
     * Deal sound - card dealing
     */
    playDealSound(ctx) {
        // Swoosh sound
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / buffer.length);
        }
        
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        
        const gain = ctx.createGain();
        gain.gain.value = 0.15 * this.masterVolume;
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start();
    },

    /**
     * Error sound - negative feedback
     */
    playErrorSound(ctx) {
        this.createOscillator(ctx, 'square', 200, 0.15, 0.2);
        setTimeout(() => {
            this.createOscillator(ctx, 'square', 150, 0.2, 0.15);
        }, 100);
    },

    /**
     * Notification sound - gentle ping
     */
    playNotificationSound(ctx) {
        this.createOscillator(ctx, 'sine', 880, 0.1, 0.15);
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 1100, 0.15, 0.1);
        }, 80);
    },

    /**
     * Warning sound - alarm-like urgent tone
     */
    playWarningSound(ctx) {
        // Create urgent alarm sound
        this.createOscillator(ctx, 'sawtooth', 440, 0.15, 0.2);
        setTimeout(() => {
            this.createOscillator(ctx, 'sawtooth', 550, 0.15, 0.2);
        }, 150);
        setTimeout(() => {
            this.createOscillator(ctx, 'sawtooth', 440, 0.15, 0.2);
        }, 300);
        setTimeout(() => {
            this.createOscillator(ctx, 'sawtooth', 550, 0.2, 0.25);
        }, 450);
    },

    /**
     * Battle sound - intense combat start
     */
    playBattleSound(ctx) {
        // Low rumble
        this.createOscillator(ctx, 'sawtooth', 80, 0.3, 0.25);
        // Rising tension
        setTimeout(() => {
            this.createOscillator(ctx, 'square', 220, 0.15, 0.15);
        }, 100);
        setTimeout(() => {
            this.createOscillator(ctx, 'square', 330, 0.15, 0.15);
        }, 200);
        setTimeout(() => {
            this.createOscillator(ctx, 'square', 440, 0.2, 0.2);
        }, 300);
    },

    /* ------------------- NEW: Player / Mech Combat Sounds ------------------- */
    playPlayerStrikeSound(ctx) {
        // Metallic sword hit: short high-pitched click + low body
        this.createOscillator(ctx, 'triangle', 1200, 0.06, 0.08);
        this.createOscillator(ctx, 'sawtooth', 250, 0.12, 0.08);
        setTimeout(() => { this.createOscillator(ctx, 'sine', 1800, 0.08, 0.06); }, 30);
    },

    playPlayerShootSound(ctx) {
        // Laser shot: bright sweep
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.18 * this.masterVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.18);
    },

    playPlayerUnarmedSound(ctx) {
        // Thuds for kicks/punches
        this.createOscillator(ctx, 'square', 220, 0.06, 0.12);
        setTimeout(() => { this.createOscillator(ctx, 'sine', 330, 0.06, 0.06); }, 30);
    },

    playMechAttackSound(ctx) {
        // Heavy mechanical strike
        this.createOscillator(ctx, 'sawtooth', 90, 0.15, 0.25);
        setTimeout(() => { this.createOscillator(ctx, 'square', 320, 0.12, 0.12); }, 30);
        // metallic clang overlay
        setTimeout(() => { this.createOscillator(ctx, 'triangle', 1400, 0.18, 0.08); }, 60);
    },

    playMechAmbientSound(ctx) {
        // Longer ominous hum (short-lived) for ambiance
        this.createOscillator(ctx, 'sawtooth', 60, 1.6, 0.16);
        setTimeout(() => { this.createOscillator(ctx, 'sine', 420, 0.9, 0.06); }, 300);
        setTimeout(() => { this.createOscillator(ctx, 'sine', 720, 0.7, 0.04); }, 800);
    },

    playMechIntroSound(ctx) {
        // ominous rising mechanical chord
        this.createOscillator(ctx, 'sawtooth', 50, 0.6, 0.18);
        setTimeout(() => { this.createOscillator(ctx, 'square', 300, 0.45, 0.12); }, 120);
        setTimeout(() => { this.createOscillator(ctx, 'triangle', 1200, 0.25, 0.06); }, 260);
    },

    /**
     * Coin Flip sound - metallic coin flip
     */
    playCoinFlipSound(ctx) {
        // Coin flip swoosh
        this.createOscillator(ctx, 'sawtooth', 400, 0.1, 0.15);
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 600, 0.08, 0.1);
        }, 50);
        setTimeout(() => {
            this.createOscillator(ctx, 'triangle', 800, 0.05, 0.08);
        }, 100);
    },

    /**
     * Dice Roll sound - tumbling dice
     */
    playDiceRollSound(ctx) {
        // Rolling sound with multiple bounces
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const freq = 300 + Math.random() * 200;
                this.createOscillator(ctx, 'square', freq, 0.03, 0.08);
            }, i * 40);
        }
        // Final settle
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 400, 0.1, 0.12);
        }, 280);
    },

    /**
     * Slots Spin sound - mechanical slot machine
     */
    playSlotsSpinSound(ctx) {
        // Mechanical whirring
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.2 * this.masterVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        
        // Clickety-clack sounds
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createOscillator(ctx, 'square', 1000 + Math.random() * 500, 0.02, 0.06);
            }, 100 + i * 60);
        }
    },

    /**
     * Blackjack Deal sound - card shuffle and deal
     */
    playBlackjackDealSound(ctx) {
        // Card shuffle riffle
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createOscillator(ctx, 'sawtooth', 200 + Math.random() * 100, 0.02, 0.05);
            }, i * 25);
        }
        // Deal swoosh
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 300, 0.08, 0.1);
        }, 250);
    },

    /**
     * Wheel Spin sound - carnival wheel
     */
    playWheelSpinSound(ctx) {
        // Spinning wheel sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1.5);
        
        gain.gain.setValueAtTime(0.25 * this.masterVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.8);
        
        // Tick sounds as it slows
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                this.createOscillator(ctx, 'square', 800, 0.03, 0.08);
            }, 200 + i * 120);
        }
    },

    /**
     * Plinko Drop sound - ball bouncing
     */
    playPlinkoDropSound(ctx) {
        // Initial drop
        this.createOscillator(ctx, 'sine', 600, 0.05, 0.1);
        
        // Bouncing sounds
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const freq = 400 + Math.random() * 300;
                this.createOscillator(ctx, 'triangle', freq, 0.03, 0.06);
            }, 100 + i * 80);
        }
        
        // Final settle
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 200, 0.15, 0.08);
        }, 800);
    },

    /**
     * Mines Reveal sound - mysterious reveal
     */
    playMinesRevealSound(ctx) {
        // Mysterious reveal sound
        this.createOscillator(ctx, 'sawtooth', 150, 0.1, 0.12);
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 300, 0.08, 0.08);
        }, 60);
        setTimeout(() => {
            this.createOscillator(ctx, 'triangle', 450, 0.05, 0.06);
        }, 120);
    },

    /**
     * Crash Launch sound - rocket launch
     */
    playCrashLaunchSound(ctx) {
        // Rocket ignition
        this.createOscillator(ctx, 'sawtooth', 80, 0.2, 0.2);
        
        // Rising engine sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.8);
        
        gain.gain.setValueAtTime(0.15 * this.masterVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1);
    },

    /**
     * Dragon Awaken sound - epic dragon roar
     */
    playDragonAwakenSound(ctx) {
        // Deep dragon rumble
        this.createOscillator(ctx, 'sawtooth', 60, 0.3, 0.25);
        
        // Rising roar
        setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);
            
            gain.gain.setValueAtTime(0.2 * this.masterVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
        }, 200);
    },

    /**
     * Cosmic Explore sound - spacey exploration
     */
    playCosmicExploreSound(ctx) {
        // Spacey whoosh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.2 * this.masterVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        
        // Star twinkles
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 1200, 0.08, 0.08);
            this.createOscillator(ctx, 'sine', 1600, 0.06, 0.06);
        }, 200);
    },

    /**
     * Thunder sound - Zeus lightning strike
     */
    playThunderSound(ctx) {
        // Deep thunder rumble
        const rumbleOsc = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        
        rumbleOsc.type = 'sawtooth';
        rumbleOsc.frequency.setValueAtTime(40, ctx.currentTime);
        rumbleOsc.frequency.setValueAtTime(60, ctx.currentTime + 0.1);
        
        rumbleGain.gain.setValueAtTime(0.3 * this.masterVolume, ctx.currentTime);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);
        
        rumbleOsc.start(ctx.currentTime);
        rumbleOsc.stop(ctx.currentTime + 0.8);
        
        // Lightning crack
        setTimeout(() => {
            this.createOscillator(ctx, 'square', 800, 0.1, 0.15);
            this.createOscillator(ctx, 'sawtooth', 400, 0.08, 0.12);
        }, 150);
        
        // Echo effect
        setTimeout(() => {
            this.createOscillator(ctx, 'sine', 200, 0.15, 0.08);
        }, 300);
    },

    /**
     * Candy Cascade sound - sweet and fun
     */
    playCandyCascadeSound(ctx) {
        // Bouncy candy sounds
        const notes = [523, 659, 784, 523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(ctx, 'sine', freq, 0.08, 0.12);
            }, i * 60);
        });
        
        // Cascade effect
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.createOscillator(ctx, 'triangle', 800 + Math.random() * 400, 0.03, 0.05);
                }, i * 40);
            }
        }, 500);
    },

    /**
     * Poker Deal sound - professional card dealing
     */
    playPokerDealSound(ctx) {
        // Professional shuffle
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                this.createOscillator(ctx, 'sawtooth', 250 + Math.random() * 50, 0.02, 0.04);
            }, i * 30);
        }
        
        // Deal to players
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.createOscillator(ctx, 'sine', 350, 0.04, 0.06);
                }, i * 100);
            }
        }, 200);
    },

    /**
     * Show bonus popup notification in bottom right corner
     */
    showBonusPopup(rarityName, reward, skillPoints = 0) {
        const container = document.getElementById('bonusPopupContainer');
        if (!container) return;

        const popup = document.createElement('div');
        popup.className = 'bonus-popup';
        
        // Determine rarity class (lowercase and hyphenated)
        const rarityClass = rarityName.toLowerCase();
        if (rarityClass !== 'common') {
            popup.classList.add(rarityClass);
        }

        // Build popup text with skill points if earned
        let popupText = `${rarityName} you gained ${reward} as a bonus`;
        if (skillPoints > 0) {
            popupText += ` and +${skillPoints} 🎓`;
        }
        popup.textContent = popupText;
        
        container.appendChild(popup);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            popup.classList.add('fade-out');
            setTimeout(() => {
                popup.remove();
            }, 300);
        }, 3000);
    },

    // ==========================================
    // SOCIAL TAB
    // ==========================================

    /**
     * Social state
     */
    socialState: {
        currentChannel: 'global',
        messages: [],
        guild: null,
        trades: [],
        onlineCount: Math.floor(Math.random() * 500) + 100
    },

    // ==========================================
    // SETTINGS TAB
    // ==========================================

    /**
     * Settings state
     */
    settings: {
        theme: 'default',
        accentColor: '#FF6B35',
        animations: true,
        particles: true,
        numberFormat: 'short',
        sound: true,
        volume: 50,
        notificationSound: true,
        autoSaveInterval: 60,
        confirmPurchases: false,
        tooltips: true,
        offlineProgress: true,
        achievementPopups: true,
        bonusNotifications: true,
        chatNotifications: true
        ,debug: false
    },

    /**
     * Setup settings tab
     */
    setupSettingsTab() {
        this.loadSettings();
        this.setupThemeSettings();
        this.setupAudioSettings();
        this.setupGameplaySettings();
        this.setupNotificationSettings();
        this.setupDataManagement();
        this.updateSettingsDisplay();
        
        // Update about stats every second (matching stats tab)
        setInterval(() => this.updateAboutStats(), 1000);
        this.updateAboutStats();
    },

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('hostxSettings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
        this.applySettings();
    },

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('hostxSettings', JSON.stringify(this.settings));
        this.applySettings();
    },

    /**
     * Apply current settings
     */
    applySettings() {
        // Apply theme
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        if (this.settings.theme !== 'default') {
            document.body.classList.add(`theme-${this.settings.theme}`);
        }

        // Apply accent color
        document.documentElement.style.setProperty('--primary-color', this.settings.accentColor);

        // Apply animations
        if (!this.settings.animations) {
            document.body.classList.add('animations-disabled');
        } else {
            document.body.classList.remove('animations-disabled');
        }
        // Apply debug toggle to GAME.CONFIG if present
        try { if (typeof GAME !== 'undefined' && GAME.CONFIG) GAME.CONFIG.DEBUG = !!this.settings.debug; } catch (e) { /* ignore */ }
    },

    /**
     * Setup theme settings
     */
    setupThemeSettings() {
        const themeSelect = document.getElementById('themeSelect');
        const accentPicker = document.getElementById('accentColorPicker');
        const animationsToggle = document.getElementById('animationsToggle');
        const particlesToggle = document.getElementById('particlesToggle');
        const numberFormatSelect = document.getElementById('numberFormatSelect');

        themeSelect?.addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.saveSettings();
            this.showNotification(`Theme changed to ${e.target.options[e.target.selectedIndex].text}`, 'success');
        });

        accentPicker?.addEventListener('change', (e) => {
            this.settings.accentColor = e.target.value;
            this.saveSettings();
        });

        animationsToggle?.addEventListener('change', (e) => {
            this.settings.animations = e.target.checked;
            this.saveSettings();
        });

        particlesToggle?.addEventListener('change', (e) => {
            this.settings.particles = e.target.checked;
            this.saveSettings();
        });

        numberFormatSelect?.addEventListener('change', (e) => {
            this.settings.numberFormat = e.target.value;
            this.saveSettings();
            this.updateDisplay();
        });
    },

    /**
     * Setup audio settings
     */
    setupAudioSettings() {
        const soundToggle = document.getElementById('soundToggle');
        const volumeSlider = document.getElementById('volumeSlider');
        const notificationSoundToggle = document.getElementById('notificationSoundToggle');

        soundToggle?.addEventListener('change', (e) => {
            this.settings.sound = e.target.checked;
            this.saveSettings();
        });

        volumeSlider?.addEventListener('input', (e) => {
            this.settings.volume = parseInt(e.target.value);
            this.saveSettings();
        });

        notificationSoundToggle?.addEventListener('change', (e) => {
            this.settings.notificationSound = e.target.checked;
            this.saveSettings();
        });
    },

    /**
     * Setup gameplay settings
     */
    setupGameplaySettings() {
        const autoSaveSelect = document.getElementById('autoSaveSelect');
        const confirmPurchasesToggle = document.getElementById('confirmPurchasesToggle');
        const tooltipsToggle = document.getElementById('tooltipsToggle');
        const offlineProgressToggle = document.getElementById('offlineProgressToggle');
        const debugToggle = document.getElementById('debugToggle');

        autoSaveSelect?.addEventListener('change', (e) => {
            this.settings.autoSaveInterval = parseInt(e.target.value);
            this.saveSettings();
        });

        confirmPurchasesToggle?.addEventListener('change', (e) => {
            this.settings.confirmPurchases = e.target.checked;
            this.saveSettings();
        });

        tooltipsToggle?.addEventListener('change', (e) => {
            this.settings.tooltips = e.target.checked;
            this.saveSettings();
        });

        offlineProgressToggle?.addEventListener('change', (e) => {
            this.settings.offlineProgress = e.target.checked;
            this.saveSettings();
        });
        debugToggle?.addEventListener('change', (e) => {
            this.settings.debug = e.target.checked;
            this.saveSettings();
            try { if (typeof GAME !== 'undefined' && GAME.CONFIG) GAME.CONFIG.DEBUG = !!this.settings.debug; } catch (e) { /* ignore */ }
            // Refresh the fighting UI immediately so debug buttons appear/disappear
            try { this.setupFightingTab(); } catch (e) { /* ignore */ }
        });
    },

    /**
     * Setup notification settings
     */
    setupNotificationSettings() {
        const achievementPopupsToggle = document.getElementById('achievementPopupsToggle');
        const bonusNotificationsToggle = document.getElementById('bonusNotificationsToggle');
        const chatNotificationsToggle = document.getElementById('chatNotificationsToggle');

        achievementPopupsToggle?.addEventListener('change', (e) => {
            this.settings.achievementPopups = e.target.checked;
            this.saveSettings();
        });

        bonusNotificationsToggle?.addEventListener('change', (e) => {
            this.settings.bonusNotifications = e.target.checked;
            this.saveSettings();
        });

        chatNotificationsToggle?.addEventListener('change', (e) => {
            this.settings.chatNotifications = e.target.checked;
            this.saveSettings();
        });
    },

    /**
     * Setup data management buttons
     */
    setupDataManagement() {
        const exportBtn = document.getElementById('exportSaveBtn');
        const importBtn = document.getElementById('importSaveBtn');
        const importInput = document.getElementById('importFileInput');
        const hardResetBtn = document.getElementById('hardResetBtn');
        const clearStuckBtn = document.getElementById('clearStuckBattleBtn');

        exportBtn?.addEventListener('click', () => {
            this.exportSave();
        });

        importBtn?.addEventListener('click', () => {
            importInput?.click();
        });

        importInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importSave(e.target.files[0]);
            }
        });

        hardResetBtn?.addEventListener('click', () => {
            this.hardReset();
        });

        clearStuckBtn?.addEventListener('click', () => {
            this.showNotification('Clearing stuck battle state...', 'info');
            this.clearStuckBattleState();
            this.showNotification('Stuck battle state cleared', 'success');
        });
    },

    /**
     * Export save data
     */
    exportSave() {
        const saveData = localStorage.getItem('hostxGameSave');
        if (!saveData) {
            this.showNotification('No save data to export!', 'error');
            return;
        }

        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hostx-save-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Save exported successfully!', 'success');
    },

    /**
     * Import save data
     */
    importSave(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.state && data.version !== undefined) {
                    if (confirm('This will overwrite your current save. Continue?')) {
                        localStorage.setItem('hostxGameSave', e.target.result);
                        location.reload();
                    }
                } else {
                    this.showNotification('Invalid save file!', 'error');
                }
            } catch (err) {
                this.showNotification('Error reading save file!', 'error');
            }
        };
        reader.readAsText(file);
    },

    /**
     * Hard reset all data
     */
    hardReset() {
        const confirm1 = confirm('⚠️ WARNING: This will delete ALL your progress!\n\nAre you sure?');
        if (!confirm1) return;

        const confirm2 = prompt('Type "DELETE" to confirm hard reset:');
        if (confirm2 !== 'DELETE') {
            this.showNotification('Hard reset cancelled.', 'info');
            return;
        }

        localStorage.removeItem('hostxGameSave');
        localStorage.removeItem('hostxSettings');
        localStorage.removeItem('cookieConsent');
        location.reload();
    },

    /**
     * Update settings display to match current values
     */
    updateSettingsDisplay() {
        const s = this.settings;
        
        const setChecked = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.checked = value;
        };
        
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        setValue('themeSelect', s.theme);
        setValue('accentColorPicker', s.accentColor);
        setChecked('animationsToggle', s.animations);
        setChecked('particlesToggle', s.particles);
        setValue('numberFormatSelect', s.numberFormat);
        setChecked('soundToggle', s.sound);
        setValue('volumeSlider', s.volume);
        setChecked('notificationSoundToggle', s.notificationSound);
        setValue('autoSaveSelect', s.autoSaveInterval);
        setChecked('confirmPurchasesToggle', s.confirmPurchases);
        setChecked('tooltipsToggle', s.tooltips);
        setChecked('offlineProgressToggle', s.offlineProgress);
        setChecked('achievementPopupsToggle', s.achievementPopups);
        setChecked('bonusNotificationsToggle', s.bonusNotifications);
        setChecked('chatNotificationsToggle', s.chatNotifications);
        setChecked('debugToggle', s.debug);
    },

    /**
     * Update about stats
     */
    updateAboutStats() {
        // Update play time
        const stats = GAME.state.stats || {};
        const totalTime = stats.totalPlayTime || 0;
        const hours = Math.floor(totalTime / 3600000);
        const minutes = Math.floor((totalTime % 3600000) / 60000);
        
        const playTimeEl = document.getElementById('totalPlayTime');
        if (playTimeEl) {
            playTimeEl.textContent = `${hours}h ${minutes}m`;
        }

        // Update save size
        const saveData = localStorage.getItem('hostxGameSave') || '';
        const saveSize = new Blob([saveData]).size;
        const saveSizeKB = (saveSize / 1024).toFixed(1);
        
        const saveSizeEl = document.getElementById('saveSize');
        if (saveSizeEl) {
            saveSizeEl.textContent = `${saveSizeKB} KB`;
        }
    },

    /**
     * Setup social tab
     */
    setupSocialTab() {
        this.setupSocialSubTabs();
        this.setupChat();
        this.setupTrading();
        this.setupGuild();
        this.simulateOnlinePlayers();
    },

    /**
     * Setup social sub-tab navigation
     */
    setupSocialSubTabs() {
        const tabBtns = document.querySelectorAll('.social-tab-btn');
        const panels = document.querySelectorAll('.social-panel');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.socialTab;
                
                tabBtns.forEach(b => b.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                const targetPanel = document.getElementById(`social-${tabId}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    },

    /**
     * Setup chat functionality
     */
    setupChat() {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendChatBtn');
        const channelBtns = document.querySelectorAll('.chat-channel-btn');
        const emoteBtns = document.querySelectorAll('.emote-btn');

        // Send message
        const sendMessage = () => {
            const text = chatInput.value.trim();
            if (!text) return;
            
            // Check for commands
            if (text.startsWith('/')) {
                this.handleChatCommand(text);
            } else {
                this.addChatMessage({
                    username: GAME.state.playerName || 'Player',
                    text: text,
                    isOwn: true,
                    time: new Date()
                });
            }
            
            chatInput.value = '';
        };

        sendBtn?.addEventListener('click', sendMessage);
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Channel switching
        channelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                channelBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.socialState.currentChannel = btn.dataset.channel;
                this.loadChannelMessages(btn.dataset.channel);
            });
        });

        // Emote buttons
        emoteBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                chatInput.value += btn.dataset.emote;
                chatInput.focus();
            });
        });

        // Load initial bot messages
        this.loadInitialMessages();
    },

    /**
     * Handle chat commands
     */
    handleChatCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        
        switch (cmd) {
            case '/help':
                this.addSystemMessage('Available commands: /help, /stats, /online, /clear');
                break;
            case '/stats':
                this.addSystemMessage(`Your stats: ${GAME.formatNumber(GAME.state.coins)} coins, ${GAME.state.prestigeLevel} prestige, ${GAME.state.skillPoints} SP`);
                break;
            case '/online':
                this.addSystemMessage(`${this.socialState.onlineCount} players currently online`);
                break;
            case '/clear':
                document.getElementById('chatMessages').innerHTML = '';
                break;
            default:
                this.addSystemMessage('Unknown command. Use /help for available commands.');
        }
    },

    /**
     * Add a chat message
     */
    addChatMessage(msg) {
        const messagesDiv = document.getElementById('chatMessages');
        if (!messagesDiv) return;

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message${msg.isOwn ? ' own-message' : ''}`;
        
        const avatarEmoji = msg.isOwn ? '😎' : this.getRandomEmoji();
        const time = msg.time ? new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
        
        messageEl.innerHTML = `
            <div class="chat-avatar">${avatarEmoji}</div>
            <div class="chat-message-content">
                <span class="chat-username${msg.role ? ' ' + msg.role : ''}">${msg.username}</span>
                <div class="chat-text">${this.escapeHtml(msg.text)}</div>
                <div class="chat-time">${time}</div>
            </div>
        `;
        
        messagesDiv.appendChild(messageEl);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Limit messages to 50
        while (messagesDiv.children.length > 50) {
            messagesDiv.removeChild(messagesDiv.firstChild);
        }
    },

    /**
     * Add a system message
     */
    addSystemMessage(text) {
        const messagesDiv = document.getElementById('chatMessages');
        if (!messagesDiv) return;

        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message system-message';
        messageEl.innerHTML = `
            <div class="chat-avatar">🤖</div>
            <div class="chat-message-content">
                <span class="chat-username admin">System</span>
                <div class="chat-text">${text}</div>
            </div>
        `;
        
        messagesDiv.appendChild(messageEl);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    /**
     * Load initial bot messages
     */
    loadInitialMessages() {
        const botMessages = [
            { username: 'CryptoKing99', text: 'Just hit 1M coins! 🚀', role: '' },
            { username: 'ServerFarm_Pro', text: 'Anyone trading prestige points?', role: '' },
            { username: 'ClickMaster', text: 'Our guild needs 2 more members!', role: '' },
            { username: 'PowerHouse', text: 'Finally got my nuclear reactor! ⚡', role: '' },
            { username: 'Admin_Sarah', text: 'Welcome to HOSTX Coin everyone! 👋', role: 'mod' },
        ];

        setTimeout(() => {
            botMessages.forEach((msg, i) => {
                setTimeout(() => {
                    this.addChatMessage({
                        ...msg,
                        time: new Date(Date.now() - (botMessages.length - i) * 60000)
                    });
                }, i * 500);
            });
        }, 1000);

        // Simulate incoming messages periodically
        this.startBotMessages();
    },

    /**
     * Load channel-specific messages
     */
    loadChannelMessages(channel) {
        const messagesDiv = document.getElementById('chatMessages');
        messagesDiv.innerHTML = `
            <div class="chat-welcome">
                <p>📢 Welcome to #${channel} channel!</p>
            </div>
        `;
    },

    /**
     * Start bot message simulation
     */
    startBotMessages() {
        const botMessages = [
            { username: 'GoldMiner42', text: 'Anyone want to trade coins for skill points?' },
            { username: 'QuantumGamer', text: 'Finally unlocked quantum servers! 🎉' },
            { username: 'CasinoKing', text: 'Just won big on Dragon\'s Lair! 🐉' },
            { username: 'NewPlayer123', text: 'Hey everyone, just started playing!' },
            { username: 'ProClicker', text: 'Tips for new players: focus on power first!' },
            { username: 'GuildLeader_X', text: 'Recruiting for top 10 guild!' },
            { username: 'CryptoWhale', text: 'Hit 1 billion coins today 💰' },
            { username: 'TechNerd', text: 'Solar farms are underrated imo' },
            { username: 'SpeedRunner', text: 'New PB: 100k coins in 5 minutes' },
            { username: 'Investor101', text: 'Always reinvest your earnings!' },
        ];

        setInterval(() => {
            if (Math.random() > 0.7 && this.socialState.currentChannel === 'global') {
                const msg = botMessages[Math.floor(Math.random() * botMessages.length)];
                this.addChatMessage({
                    ...msg,
                    time: new Date()
                });
            }
        }, 15000);
    },

    /**
     * Simulate online player count
     */
    simulateOnlinePlayers() {
        setInterval(() => {
            // Randomly fluctuate online count
            this.socialState.onlineCount += Math.floor(Math.random() * 20) - 10;
            this.socialState.onlineCount = Math.max(50, Math.min(999, this.socialState.onlineCount));
            
            const onlineEl = document.getElementById('onlineCount');
            if (onlineEl) {
                onlineEl.textContent = this.socialState.onlineCount;
            }
        }, 30000);

        // Initial update
        const onlineEl = document.getElementById('onlineCount');
        if (onlineEl) {
            onlineEl.textContent = this.socialState.onlineCount;
        }
    },

    /**
     * Get random emoji for avatar
     */
    getRandomEmoji() {
        const emojis = ['😀', '😎', '🤠', '🦊', '🐱', '🦁', '🐸', '🦄', '🤖', '👽', '🎮', '⚡'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Setup trading system
     */
    setupTrading() {
        const createTradeBtn = document.getElementById('createTradeBtn');
        const createTradeModal = document.getElementById('createTradeModal');
        const submitTradeBtn = document.getElementById('submitTradeBtn');
        const cancelTradeBtn = document.getElementById('cancelTradeBtn');

        createTradeBtn?.addEventListener('click', () => {
            createTradeModal?.classList.remove('hidden');
        });

        cancelTradeBtn?.addEventListener('click', () => {
            createTradeModal?.classList.add('hidden');
        });

        submitTradeBtn?.addEventListener('click', () => {
            this.createTrade();
            createTradeModal?.classList.add('hidden');
        });

        // Load sample trades
        this.loadSampleTrades();
    },

    /**
     * Create a new trade
     */
    createTrade() {
        const offerType = document.getElementById('offerType').value;
        const offerAmount = parseInt(document.getElementById('offerAmount').value) || 0;
        const wantType = document.getElementById('wantType').value;
        const wantAmount = parseInt(document.getElementById('wantAmount').value) || 0;

        if (offerAmount <= 0 || wantAmount <= 0) {
            this.showNotification('Please enter valid amounts!', 'error');
            return;
        }

        if (offerType === wantType) {
            this.showNotification('Cannot trade same resource type!', 'error');
            return;
        }

        // Check if player has enough resources
        const hasEnough = this.checkTradeResources(offerType, offerAmount);
        if (!hasEnough) {
            this.showNotification(`Not enough ${offerType} to create this trade!`, 'error');
            return;
        }

        // Add trade to list
        const trade = {
            id: Date.now(),
            user: GAME.state.playerName || 'You',
            isOwn: true,
            offerType,
            offerAmount,
            wantType,
            wantAmount
        };

        this.socialState.trades.unshift(trade);
        this.updateTradeCount();
        this.renderTrades();
        this.showNotification('Trade created successfully!', 'success');
    },

    /**
     * Check if player has enough resources for trade
     */
    checkTradeResources(type, amount) {
        switch (type) {
            case 'coins': return GAME.state.coins >= amount;
            case 'prestige': return (GAME.state.prestigePoints || 0) >= amount;
            case 'skill': return (GAME.state.skillPoints || 0) >= amount;
            default: return false;
        }
    },

    /**
     * Load sample trades
     */
    loadSampleTrades() {
        const sampleTrades = [
            { id: 1, user: 'CryptoTrader', isOwn: false, offerType: 'coins', offerAmount: 50000, wantType: 'prestige', wantAmount: 5 },
            { id: 2, user: 'SkillSeeker', isOwn: false, offerType: 'prestige', offerAmount: 10, wantType: 'skill', wantAmount: 3 },
            { id: 3, user: 'CoinHoarder', isOwn: false, offerType: 'skill', offerAmount: 5, wantType: 'coins', wantAmount: 100000 },
        ];

        this.socialState.trades = sampleTrades;
        this.updateTradeCount();
        this.renderTrades();
    },

    /**
     * Update trade counts
     */
    updateTradeCount() {
        const yourTrades = this.socialState.trades.filter(t => t.isOwn).length;
        const activeTrades = this.socialState.trades.length;
        
        document.getElementById('yourTradesCount').textContent = yourTrades;
        document.getElementById('activeTradesCount').textContent = activeTrades;
    },

    /**
     * Render trade listings
     */
    renderTrades() {
        const listingsDiv = document.getElementById('tradeListings');
        if (!listingsDiv) return;

        if (this.socialState.trades.length === 0) {
            listingsDiv.innerHTML = `
                <div class="no-trades">
                    <p>📭 No active trades</p>
                    <p class="trade-tip">Be the first to create a trade!</p>
                </div>
            `;
            return;
        }

        const typeIcons = {
            coins: '💰',
            prestige: '✨',
            skill: '🎯'
        };

        listingsDiv.innerHTML = this.socialState.trades.map(trade => `
            <div class="trade-listing">
                <div class="trade-user">
                    <div class="trade-user-avatar">${trade.isOwn ? '😎' : this.getRandomEmoji()}</div>
                    <span class="trade-user-name">${trade.user}</span>
                </div>
                <div class="trade-details">
                    <div class="trade-offer">
                        <div>${typeIcons[trade.offerType]} ${GAME.formatNumber(trade.offerAmount)}</div>
                        <small>${trade.offerType}</small>
                    </div>
                    <span class="trade-arrow">⇄</span>
                    <div class="trade-want">
                        <div>${typeIcons[trade.wantType]} ${GAME.formatNumber(trade.wantAmount)}</div>
                        <small>${trade.wantType}</small>
                    </div>
                </div>
                <button class="trade-action-btn ${trade.isOwn ? 'cancel' : ''}" 
                        onclick="UI.${trade.isOwn ? 'cancelTrade' : 'acceptTrade'}(${trade.id})">
                    ${trade.isOwn ? 'Cancel' : 'Accept'}
                </button>
            </div>
        `).join('');
    },

    /**
     * Accept a trade
     */
    acceptTrade(tradeId) {
        const trade = this.socialState.trades.find(t => t.id === tradeId);
        if (!trade) return;

        // Check if player has enough resources
        if (!this.checkTradeResources(trade.wantType, trade.wantAmount)) {
            this.showNotification(`Not enough ${trade.wantType} to accept this trade!`, 'error');
            return;
        }

        // Execute trade
        this.executeTradeResource(trade.wantType, -trade.wantAmount);
        this.executeTradeResource(trade.offerType, trade.offerAmount);

        // Remove trade
        this.socialState.trades = this.socialState.trades.filter(t => t.id !== tradeId);
        
        // Update completed count
        const completedEl = document.getElementById('completedTradesCount');
        completedEl.textContent = parseInt(completedEl.textContent) + 1;

        this.updateTradeCount();
        this.renderTrades();
        this.showNotification('Trade completed! 🎉', 'success');
        GAME.saveGame();
    },

    /**
     * Cancel own trade
     */
    cancelTrade(tradeId) {
        this.socialState.trades = this.socialState.trades.filter(t => t.id !== tradeId);
        this.updateTradeCount();
        this.renderTrades();
        this.showNotification('Trade cancelled', 'info');
    },

    /**
     * Execute resource change from trade
     */
    executeTradeResource(type, amount) {
        switch (type) {
            case 'coins':
                GAME.state.coins += amount;
                break;
            case 'prestige':
                GAME.state.prestigePoints = (GAME.state.prestigePoints || 0) + amount;
                break;
            case 'skill':
                GAME.state.skillPoints = (GAME.state.skillPoints || 0) + amount;
                // Refresh research tab when skill points are gained
                this.setupResearchTab();
                break;
        }
        this.updateDisplay();
    },

    /**
     * Setup guild system
     */
    setupGuild() {
        const createGuildBtn = document.getElementById('createGuildBtn');
        const browseGuildsBtn = document.getElementById('browseGuildsBtn');
        const createGuildModal = document.getElementById('createGuildModal');
        const browseGuildsModal = document.getElementById('browseGuildsModal');
        const confirmCreateGuildBtn = document.getElementById('confirmCreateGuildBtn');
        const cancelCreateGuildBtn = document.getElementById('cancelCreateGuildBtn');
        const closeBrowseBtn = document.getElementById('closeBrowseBtn');

        // Emblem picker
        const emblemOptions = document.querySelectorAll('.emblem-option');
        emblemOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                emblemOptions.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        createGuildBtn?.addEventListener('click', () => {
            createGuildModal?.classList.remove('hidden');
        });

        browseGuildsBtn?.addEventListener('click', () => {
            this.loadBrowseGuilds();
            browseGuildsModal?.classList.remove('hidden');
        });

        cancelCreateGuildBtn?.addEventListener('click', () => {
            createGuildModal?.classList.add('hidden');
        });

        closeBrowseBtn?.addEventListener('click', () => {
            browseGuildsModal?.classList.add('hidden');
        });

        confirmCreateGuildBtn?.addEventListener('click', () => {
            this.createGuild();
        });

        // Guild tab navigation
        const guildTabBtns = document.querySelectorAll('.guild-tab-btn');
        const guildTabContents = document.querySelectorAll('.guild-tab-content');

        guildTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.guildTab;
                
                guildTabBtns.forEach(b => b.classList.remove('active'));
                guildTabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`guild-${tabId}`)?.classList.add('active');
            });
        });

        // Deposit button
        document.getElementById('depositBtn')?.addEventListener('click', () => {
            this.depositToGuildBank();
        });

        // Leave guild button
        document.getElementById('leaveGuildBtn')?.addEventListener('click', () => {
            this.leaveGuild();
        });

        // Check if player is in a guild
        if (GAME.state.guild) {
            this.showGuildDashboard();
        }
    },

    /**
     * Create a new guild
     */
    createGuild() {
        const name = document.getElementById('newGuildName').value.trim();
        const tag = document.getElementById('newGuildTag').value.trim().toUpperCase();
        const emblem = document.querySelector('.emblem-option.selected')?.dataset.emblem || '⚔️';
        const creationCost = 10000;

        if (!name || name.length < 3) {
            this.showNotification('Guild name must be at least 3 characters!', 'error');
            return;
        }

        if (!tag || tag.length < 2 || tag.length > 4) {
            this.showNotification('Guild tag must be 2-4 characters!', 'error');
            return;
        }

        if (GAME.state.coins < creationCost) {
            this.showNotification(`You need ${GAME.formatNumber(creationCost)} coins to create a guild!`, 'error');
            return;
        }

        // Deduct coins and create guild
        GAME.state.coins -= creationCost;
        GAME.state.guild = {
            name,
            tag,
            emblem,
            level: 1,
            xp: 0,
            bank: 0,
            members: [
                { name: GAME.state.playerName || 'You', role: 'Leader', contribution: 0, isOwner: true }
            ],
            missions: [],
            totalClicks: 0,
            totalCoinsEarned: 0,
            createdAt: Date.now()
        };

        document.getElementById('createGuildModal')?.classList.add('hidden');
        this.showGuildDashboard();
        this.showNotification(`Guild "${name}" created! 🏰`, 'success');
        GAME.saveGame();
    },

    /**
     * Show guild dashboard
     */
    showGuildDashboard() {
        const noGuildState = document.getElementById('noGuildState');
        const guildDashboard = document.getElementById('guildDashboard');
        const guild = GAME.state.guild;

        if (!guild) return;

        noGuildState?.classList.add('hidden');
        guildDashboard?.classList.remove('hidden');

        // Update guild info
        document.getElementById('guildEmblem').textContent = guild.emblem;
        document.getElementById('guildName').textContent = guild.name;
        document.getElementById('guildTag').textContent = `[${guild.tag}]`;
        document.getElementById('guildLevel').textContent = guild.level;
        document.getElementById('guildMembers').textContent = `${guild.members.length}/10`;
        document.getElementById('guildBank').textContent = GAME.formatNumber(guild.bank);
        document.getElementById('guildXP').textContent = `${guild.xp}/${guild.level * 1000}`;

        // Calculate bonus
        const bonus = Math.min(guild.members.length * 5, 50);
        document.getElementById('guildBonus').textContent = `+${bonus}%`;

        // Render members
        this.renderGuildMembers();
        
        // Render achievements
        this.renderGuildAchievements();
        
        // Render missions
        this.renderGuildMissions();
    },

    /**
     * Render guild members list
     */
    renderGuildMembers() {
        const memberList = document.getElementById('guildMemberList');
        const guild = GAME.state.guild;

        if (!memberList || !guild) return;

        memberList.innerHTML = guild.members.map(member => `
            <div class="member-row">
                <div class="member-avatar">${member.isOwner ? '👑' : '😀'}</div>
                <div class="member-info">
                    <span class="member-name">${member.name}</span>
                    <span class="member-role">${member.role}</span>
                </div>
                <span class="member-contribution">💰 ${GAME.formatNumber(member.contribution)}</span>
            </div>
        `).join('');
    },

    /**
     * Load guilds for browsing
     */
    loadBrowseGuilds() {
        const browseList = document.getElementById('guildBrowseList');
        
        const sampleGuilds = [
            { name: 'Crypto Kings', tag: 'CK', emblem: '👑', members: 8, level: 5 },
            { name: 'Server Lords', tag: 'SL', emblem: '🖥️', members: 6, level: 3 },
            { name: 'Power Rangers', tag: 'PWR', emblem: '⚡', members: 10, level: 7 },
            { name: 'Click Dynasty', tag: 'CD', emblem: '🖱️', members: 4, level: 2 },
            { name: 'Elite Miners', tag: 'EM', emblem: '⛏️', members: 9, level: 6 },
        ];

        browseList.innerHTML = sampleGuilds.map(guild => `
            <div class="guild-browse-item">
                <span class="guild-browse-emblem">${guild.emblem}</span>
                <div class="guild-browse-info">
                    <span class="guild-browse-name">${guild.name} [${guild.tag}]</span>
                    <span class="guild-browse-members">👥 ${guild.members}/10 • Level ${guild.level}</span>
                </div>
                <button class="join-guild-btn" onclick="UI.joinGuild('${guild.name}')">Join</button>
            </div>
        `).join('');
    },

    /**
     * Join a guild
     */
    joinGuild(guildName) {
        // Simulate joining
        GAME.state.guild = {
            name: guildName,
            tag: guildName.split(' ').map(w => w[0]).join(''),
            emblem: '⚔️',
            level: Math.floor(Math.random() * 5) + 1,
            xp: 0,
            bank: Math.floor(Math.random() * 50000),
            members: [
                { name: 'GuildLeader', role: 'Leader', contribution: 10000, isOwner: false },
                { name: GAME.state.playerName || 'You', role: 'Member', contribution: 0, isOwner: false }
            ],
            createdAt: Date.now()
        };

        document.getElementById('browseGuildsModal')?.classList.add('hidden');
        this.showGuildDashboard();
        this.showNotification(`Joined "${guildName}"! 🎉`, 'success');
        GAME.saveGame();
    },

    /**
     * Deposit coins to guild bank
     */
    depositToGuildBank() {
        const amount = parseInt(document.getElementById('depositAmount').value) || 0;
        
        if (amount <= 0) {
            this.showNotification('Enter a valid amount!', 'error');
            return;
        }

        if (GAME.state.coins < amount) {
            this.showNotification('Not enough coins!', 'error');
            return;
        }

        GAME.state.coins -= amount;
        GAME.state.guild.bank += amount;
        
        // Add to player's contribution
        const playerMember = GAME.state.guild.members.find(m => m.isOwner !== false || m.name === (GAME.state.playerName || 'You'));
        if (playerMember) {
            playerMember.contribution += amount;
        }

        // Add guild XP
        GAME.state.guild.xp += Math.floor(amount / 100);
        
        // Check for level up
        const xpNeeded = GAME.state.guild.level * 1000;
        if (GAME.state.guild.xp >= xpNeeded) {
            GAME.state.guild.level++;
            GAME.state.guild.xp -= xpNeeded;
            this.showNotification(`Guild leveled up to ${GAME.state.guild.level}! 🎉`, 'success');
        }

        document.getElementById('depositAmount').value = '';
        this.showGuildDashboard();
        this.showNotification(`Deposited ${GAME.formatNumber(amount)} coins!`, 'success');
        this.checkGuildAchievements();
        GAME.saveGame();
    },

    /**
     * Leave current guild
     */
    leaveGuild() {
        if (confirm('Are you sure you want to leave your guild?')) {
            GAME.state.guild = null;
            
            document.getElementById('guildDashboard')?.classList.add('hidden');
            document.getElementById('noGuildState')?.classList.remove('hidden');
            
            this.showNotification('You left the guild.', 'info');
            GAME.saveGame();
        }
    },

    /**
     * Check and unlock guild achievements
     */
    checkGuildAchievements() {
        if (!GAME.state.guild) return;

        const guild = GAME.state.guild;
        let unlockedAny = false;

        const guildAchievements = this.getStateSet('guildAchievements');
        for (const achievement of GAME.CONFIG.GUILD_ACHIEVEMENTS) {
            if (!guildAchievements.has(achievement.id) && achievement.condition(guild)) {
                guildAchievements.add(achievement.id);
                unlockedAny = true;

                // Apply rewards
                if (achievement.reward.guildXP) {
                    guild.xp += achievement.reward.guildXP;
                }
                if (achievement.reward.skillPoints) {
                    GAME.earnSkillPoints(achievement.reward.skillPoints);
                }

                this.showNotification(`🏆 Guild Achievement: ${achievement.name}!`, 'success');
            }
        }

        if (unlockedAny) {
            GAME.saveGame();
            this.renderGuildAchievements();
        }
    },

    /**
     * Render guild achievements
     */
    renderGuildAchievements() {
        const container = document.getElementById('guildAchievementsList');
        if (!container) return;

        container.innerHTML = '';

        const guildAchievementsRender = this.getStateSet('guildAchievements');
        for (const achievement of GAME.CONFIG.GUILD_ACHIEVEMENTS) {
            const isUnlocked = guildAchievementsRender.has(achievement.id);
            
            const achievementEl = document.createElement('div');
            achievementEl.className = `guild-achievement ${isUnlocked ? 'unlocked' : 'locked'}`;
            achievementEl.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                    ${isUnlocked ? '<span class="achievement-unlocked">✅ Unlocked</span>' : '<span class="achievement-locked">🔒 Locked</span>'}
                </div>
            `;
            
            container.appendChild(achievementEl);
        }
    },

    /**
     * Render guild missions
     */
    renderGuildMissions() {
        const container = document.getElementById('guildMissionsList');
        if (!container || !GAME.state.guild) return;

        const guild = GAME.state.guild;
        const missions = [
            {
                id: 'collective_clicking',
                name: 'Collective Clicking',
                description: 'Guild members click 10,000 times total',
                target: 10000,
                current: guild.totalClicks || 0,
                reward: '5,000 coins + Guild XP',
                icon: '👆'
            },
            {
                id: 'guild_bank_goal',
                name: 'Treasure Hoarders',
                description: 'Collect 10,000 coins in guild bank',
                target: 10000,
                current: guild.bank || 0,
                reward: 'Skill Points + Guild XP',
                icon: '💰'
            },
            {
                id: 'member_growth',
                name: 'Growing Community',
                description: 'Reach 5 guild members',
                target: 5,
                current: guild.members.length,
                reward: 'Guild Level Boost',
                icon: '👥'
            }
        ];

        container.innerHTML = missions.map(mission => {
            const progress = Math.min((mission.current / mission.target) * 100, 100);
            const isComplete = mission.current >= mission.target;
            
            return `
                <div class="mission-card ${isComplete ? 'completed' : ''}">
                    <div class="mission-icon">${mission.icon}</div>
                    <div class="mission-info">
                        <h4>${mission.name}</h4>
                        <p>${mission.description}</p>
                        <div class="mission-progress">
                            <div class="mission-bar" style="width: ${progress}%"></div>
                        </div>
                        <span class="mission-progress-text">${GAME.formatNumber(mission.current)} / ${GAME.formatNumber(mission.target)}</span>
                    </div>
                    <div class="mission-reward">${isComplete ? '✅' : '🎁'} ${mission.reward}</div>
                </div>
            `;
        }).join('');
    }
};

// Global handler for acknowledging catastrophic file integrity failure
document.addEventListener('click', (e) => {
    try {
        if (e.target && e.target.id === 'fileIntegrityAcknowledge') {
            const overlay = document.getElementById('fileIntegrityFailureOverlay');
            if (overlay) overlay.classList.add('hidden');
            // Force reload to reflect cleared save
            try { window.location.reload(); } catch(e) { console.warn('reload failed', e); }
        }
    } catch(e) { /* ignore */ }
});

/**
 * Setup delete wallet modal
 */
function setupDeleteWalletModal() {
    const deleteBtn = document.getElementById('deleteWalletBtn');
    const modal = document.getElementById('deleteWalletModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmInput = document.getElementById('confirmInput');
    const warningText = document.getElementById('deleteWarningText');
    
    if (!deleteBtn || !modal || !confirmBtn || !cancelBtn || !warningText) {
        console.warn('Delete wallet modal elements not found');
        return;
    }
    
    deleteBtn.addEventListener('click', () => {
        // Check if any building is upgraded (has more than 1 rack unit)
        const hasUpgradedBuilding = Object.values(GAME.state.buildings).some(building => building.maxRackUnits > 1);
        
        // Update warning text based on upgrades
        if (hasUpgradedBuilding) {
            warningText.innerHTML = '<span style="color: #FF6B35; font-weight: bold;">⚠️ WARNING: All upgrades will be lost!</span><br/><br/>Type <span style="color: #FFD700; font-weight: bold;">confirm</span> to proceed:';
        } else {
            warningText.innerHTML = 'Type <span style="color: #FFD700; font-weight: bold;">confirm</span> to proceed:';
        }
        
        confirmInput.value = '';
        modal.classList.remove('hidden');
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    confirmBtn.addEventListener('click', () => {
        if (confirmInput.value === 'confirm') {
            WALLET.deleteWallet();
            localStorage.removeItem('gameState');
            location.reload();
        } else {
            alert('Please type "confirm" to delete.');
        }
    });
    
    // Close modal if clicking outside of it
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

/**
 * Setup wallet panel toggle
 */
function setupWalletPanelToggle() {
    const walletPanel = document.getElementById('walletPanel');
    const walletToggle = document.getElementById('walletToggle');
    
    if (!walletPanel || !walletToggle) {
        console.warn('Wallet panel elements not found');
        return;
    }
    
    // Start collapsed by default
    walletPanel.classList.add('collapsed');
    
    walletToggle.addEventListener('click', () => {
        walletPanel.classList.toggle('collapsed');
    });
};

/**
 * Setup delete building modal
 */
function setupDeleteBuildingModal() {
    const modal = document.getElementById('deleteBuildingModal');
    const confirmBtn = document.getElementById('confirmDeleteBuildingBtn');
    const cancelBtn = document.getElementById('cancelDeleteBuildingBtn');
    
    if (!modal || !confirmBtn || !cancelBtn) {
        console.warn('Delete building modal elements not found');
        return;
    }
    
    // Confirm delete
    confirmBtn.addEventListener('click', () => {
        const currentBuilding = GAME.getCurrentBuilding();
        if (currentBuilding && !currentBuilding.isDefault) {
            if (GAME.deleteBuilding(currentBuilding.id)) {
                GAME.saveGame();
                // Update UI
                UI.updateBuildingSelector();
                UI.updateRackInfo();
                UI.renderRack();
                // Close modal
                modal.classList.add('hidden');
            }
        }
    });
    
    // Cancel delete
    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    // Close when clicking outside modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

// Ensure initialization happens when DOM and all scripts are loaded
        if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof UI !== 'undefined' && typeof GAME !== 'undefined') {
                    if (!GAME._initCalled) {
                        GAME.init();
                    } else {
                        console.log('UI DOMContentLoaded: GAME.init already called');
                    }
                    // Ensure game loop is started once UI is ready
                    try {
                        if (typeof GAME.startGameLoop === 'function' && !GAME._gameLoopStarted) {
                            GAME.startGameLoop();
                            GAME._gameLoopStarted = true;
                            console.log('UI: GAME.startGameLoop started');
                        }
                    } catch(e) { console.warn('UI: failed to start game loop', e); }
            UI.init();
            
            // Initialize wallet display
            const walletId = WALLET.getOrCreateWalletId();
            document.getElementById('walletIdText').textContent = `Wallet ID: ${walletId}`;
            
            // Setup wallet panel toggle
            setupWalletPanelToggle();
            
            // Setup delete wallet modal
            setupDeleteWalletModal();
            
            // Setup delete building modal
            setupDeleteBuildingModal();
        }
    });
} else {
    // DOM is already loaded
    setTimeout(() => {
            if (typeof UI !== 'undefined' && typeof GAME !== 'undefined') {
            if (!GAME._initCalled) {
                GAME.init();
            } else {
                console.log('UI: GAME.init already called (delayed load)');
            }
            UI.init();
                // Start game loop if not started
                try {
                    if (typeof GAME.startGameLoop === 'function' && !GAME._gameLoopStarted) {
                        GAME.startGameLoop();
                        GAME._gameLoopStarted = true;
                        console.log('UI (delayed): GAME.startGameLoop started');
                    }
                } catch(e) { console.warn('UI (delayed): failed to start game loop', e); }
            
            // Initialize wallet display
            const walletId = WALLET.getOrCreateWalletId();
            document.getElementById('walletIdText').textContent = `Wallet ID: ${walletId}`;
            
            // Setup wallet panel toggle
            setupWalletPanelToggle();
            
            // Setup delete wallet modal
            setupDeleteWalletModal();
            
            // Setup delete building modal
            setupDeleteBuildingModal();
        }

    }, 0);
};




