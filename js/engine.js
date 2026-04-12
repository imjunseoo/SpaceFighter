class InputHandler {
    constructor() {
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, z: false, ' ': false };
        const handleKey = (e, val) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'z', 'Z'].includes(e.key)) e.preventDefault();
            const k = e.key.toLowerCase() === 'z' ? 'z' : e.key;
            if (this.keys.hasOwnProperty(k)) this.keys[k] = val;
        };
        window.addEventListener('keydown', e => handleKey(e, true));
        window.addEventListener('keyup', e => handleKey(e, false));
    }
}

class SkillManager {
    constructor() { this.attacks = []; this.particles = []; this.floatingTexts = []; }
    pushMeleeAttack(player, radius, damage, isFullCircle, arcAngle) {
        const isCrit = Math.random() < player.critChance;
        const finalDamage = isCrit ? damage * player.critMultiplier : damage;
        const cx = player.x + (isFullCircle ? 0 : player.dirX * (radius / 2));
        const cy = player.y + (isFullCircle ? 0 : player.dirY * (radius / 2));
        this.attacks.push({
            x: cx, y: cy,
            radius,
            angle: Math.atan2(player.dirY, player.dirX),
            life: 12, maxLife: 12,
            damage: finalDamage,
            isCrit,
            isFullCircle: !!isFullCircle,
            isLinear: false,
            arcAngle: arcAngle || Math.PI / 1.5,
            hitTargets: new Set()
        });
        return isCrit;
    }
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1.0, decay: Math.random() * 0.05 + 0.05, color, size: Math.random() * 3 + 1 });
    }
    createShatterParticles(x, y, color) {
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
                life: 1.0, decay: Math.random() * 0.02 + 0.02,
                color: Math.random() < 0.3 ? '#fff' : color, size: Math.random() * 5 + 2
            });
        }
    }
    createFloatingText(x, y, text, isCrit = false, color = '#fff') { this.floatingTexts.push({ x, y, text, life: 1.0, vy: -1, isCrit, color }); }
    updateAndDraw(ctx) {
        this.attacks.forEach((atk, i) => {
            if (--atk.life <= 0) this.attacks.splice(i, 1);
            ctx.beginPath();
            if (atk.isLinear) {
                ctx.save();
                ctx.translate(atk.x - (Math.cos(atk.angle) * atk.radius / 2), atk.y - (Math.sin(atk.angle) * atk.radius / 2));
                ctx.rotate(atk.angle);
                ctx.rect(0, -(atk.halfWidth||20), atk.radius, (atk.halfWidth||20)*2);
                ctx.restore();
            } else if (atk.isFullCircle) {
                ctx.arc(atk.x, atk.y, atk.radius, 0, Math.PI * 2);
            } else {
                ctx.arc(atk.x, atk.y, atk.radius, atk.angle - Math.PI / 1.5, atk.angle + Math.PI / 1.5);
            }

            const alpha = atk.life / atk.maxLife;
            let baseColor, shadowCol;
            if (atk.color) {
                // 커스텀 색상 (hex → rgb 파싱 없이 shadowColor만 사용)
                baseColor = atk.color;
                shadowCol = atk.color;
                ctx.lineWidth = 15 * alpha;
                ctx.strokeStyle = atk.color.startsWith('rgba') ? atk.color : `rgba(255,30,30,${alpha})`;
                ctx.shadowBlur = 25;
                ctx.shadowColor = shadowCol;
            } else {
                baseColor = atk.isFullCircle ? `rgba(255, 0, 255, ${alpha})` : `rgba(0, 255, 255, ${alpha})`;
                shadowCol = atk.isFullCircle ? '#f0f' : '#0ff';
                ctx.lineWidth = 15 * alpha;
                ctx.strokeStyle = baseColor;
                ctx.shadowBlur = 20;
                ctx.shadowColor = shadowCol;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        });
        this.particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy; if ((p.life -= p.decay) <= 0) this.particles.splice(i, 1);
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); ctx.globalAlpha = 1.0;
        });
        ctx.font = 'bold 16px Consolas'; ctx.textAlign = 'center';
        this.floatingTexts.forEach((t, i) => {
            t.y += t.vy; if ((t.life -= 0.05) <= 0) this.floatingTexts.splice(i, 1);
            const fs = t.fontSize || (t.isCrit ? 22 : 16);
            ctx.globalAlpha = t.life; ctx.fillStyle = t.isCrit ? '#ff0' : t.color; ctx.font = `bold ${fs}px Consolas`;
            ctx.shadowBlur = 5; ctx.shadowColor = t.isCrit ? '#f00' : (t.color === '#4ade80' ? '#0f0' : '#0ff');
            ctx.fillText(t.text, t.x, t.y); ctx.shadowBlur = 0; ctx.globalAlpha = 1.0;
        });
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas'); this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.CANVAS_WIDTH; this.canvas.height = CONFIG.CANVAS_HEIGHT;
        this.input = new InputHandler(); this.skillManager = new SkillManager();
        this.audioManager = new AudioManager();
        this.ui = {
            mainOverlay: document.getElementById('main-ui-overlay'),
            gameUILayer: document.getElementById('game-ui-layer'),
            levelup: document.getElementById('levelup-ui'),
            cards: document.getElementById('cards-container'),
            startBtn: document.getElementById('btn-mission-start'),
            hp: document.getElementById('hp-bar'), exp: document.getElementById('exp-bar'),
            score: document.getElementById('score'), timer: document.getElementById('timer'), level: document.getElementById('player-level'),
            acquiredSkills: document.getElementById('acquired-skills-container'),
            pauseMenu: document.getElementById('pause-menu'), resumeBtn: document.getElementById('resume-btn'),
            restartBtn: document.getElementById('restart-btn')
        };

        if (this.ui.startBtn) {
            this.ui.startBtn.onclick = (e) => {
                e.preventDefault();
                this.ui.startBtn.blur();
                const doStart = () => {
                    this.ui.mainOverlay.classList.add('hidden');
                    this.ui.gameUILayer.classList.remove('hidden');
                    this.canvas.classList.remove('hidden');
                    // Miku 숨기기 및 로밍 정지
                    if (this.mikuEl) this.mikuEl.style.display = 'none';
                    if (this.mikuRoamTimer) { clearTimeout(this.mikuRoamTimer); this.mikuRoamTimer = null; }
                    if (this.mikuBubble) this.mikuBubble.classList.remove('bubble-visible');
                    this.audioManager.init();
                    this.init();
                    if (!this.loopStarted) {
                        this.loopStarted = true;
                        this.lastFrameTime = performance.now();
                        requestAnimationFrame((t) => this.loop(t));
                    }
                };
                if (!localStorage.getItem('aria_tutorial_seen')) {
                    this.showTutorial(doStart);
                } else {
                    doStart();
                }
            };
        }
        const btnTutorial = document.getElementById('btn-tutorial');
        if (btnTutorial) btnTutorial.onclick = (e) => { e.preventDefault(); this.showTutorial(null); };

        this.ui.resumeBtn.onclick = () => { this.ui.resumeBtn.blur(); if (this.state === 'PAUSED_MENU') this.togglePause(); };
        this.ui.restartBtn.onclick = () => {
            this.ui.restartBtn.blur();
            if (this.state === 'PAUSED_MENU') {
                this.ui.pauseMenu.classList.add('hidden');
                this.player.hp = 0;
                this.triggerGameOver();
            }
        };
        window.addEventListener('keydown', (e) => this.handleUIKeys(e));
        this.initMiku();
        this.devToolsOpen = false;
        this.devUI = document.getElementById('dev-tools');
        document.getElementById('dev-lvup').onclick = () => { if (this.player) { this.player.level++; this.player.exp = 0; this.showLevelUpMenu(); this.updateDevInfo(); } };
        document.getElementById('dev-lvup5').onclick = () => { if (this.player) { for (let i = 0; i < 5; i++) { this.player.level++; } this.player.exp = 0; this.showLevelUpMenu(); this.updateDevInfo(); } };
        document.getElementById('dev-hp').onclick = () => { if (this.player) { this.player.hp = this.player.maxHp; this.updateHUD(); this.updateDevInfo(); } };
        document.getElementById('dev-kill-all').onclick = () => { this.enemies.forEach(e => { this.skillManager.createParticles(e.x, e.y, e.color); this.score++; }); this.enemies = []; this.updateHUD(); this.updateDevInfo(); };
        document.getElementById('dev-arondight').onclick = () => {
            if (!this.player) return;
            const def = ARTIFACT_POOL.find(a => a.id === 'arondight');
            if (!def) return;
            this.player.weaponArtifact = { defId: 'arondight', category: 'weapon', stacks: 10, cooldown: 0 };
            const idx = this.player.artifacts.findIndex(a => a.category === 'weapon');
            if (idx >= 0) this.player.artifacts[idx] = this.player.weaponArtifact;
            else this.player.artifacts.push(this.player.weaponArtifact);
            this.updateHUD(); this.updateArtifactTray(); this.updateDevInfo();
        };
        document.getElementById('dev-excalibur').onclick = () => {
            if (!this.player) return;
            const def = ARTIFACT_POOL.find(a => a.id === 'excalibur');
            if (!def) return;
            this.player.weaponArtifact = { defId: 'excalibur', category: 'weapon', stacks: 15, cooldown: 0 };
            const idx = this.player.artifacts.findIndex(a => a.category === 'weapon');
            if (idx >= 0) this.player.artifacts[idx] = this.player.weaponArtifact;
            else this.player.artifacts.push(this.player.weaponArtifact);
            this.updateHUD(); this.updateArtifactTray(); this.updateDevInfo();
        };
        document.getElementById('dev-domination').onclick = () => {
            if (!this.player) return;
            this.player.weaponArtifact = { defId: 'domination_whip', category: 'weapon', stacks: 10, cooldown: 0 };
            const idx = this.player.artifacts.findIndex(a => a.category === 'weapon');
            if (idx >= 0) this.player.artifacts[idx] = this.player.weaponArtifact;
            else this.player.artifacts.push(this.player.weaponArtifact);
            this.updateHUD(); this.updateArtifactTray(); this.updateDevInfo();
        };
        document.getElementById('dev-extinction').onclick = () => {
            if (!this.player) return;
            this.player.weaponArtifact = { defId: 'extinction_whip', category: 'weapon', stacks: 10, cooldown: 0 };
            const idx = this.player.artifacts.findIndex(a => a.category === 'weapon');
            if (idx >= 0) this.player.artifacts[idx] = this.player.weaponArtifact;
            else this.player.artifacts.push(this.player.weaponArtifact);
            this.updateHUD(); this.updateArtifactTray(); this.updateDevInfo();
        };

        const btnAchieve = document.getElementById('btn-achievements');
        if (btnAchieve) {
            btnAchieve.onclick = async (e) => {
                e.preventDefault();
                document.getElementById('achievement-modal').classList.remove('hidden');
                const listEl = document.getElementById('achievements-list');
                listEl.innerHTML = '<div class="text-center text-on-surface/50 font-body py-8">Loading achievements...</div>';

                if (typeof firebaseDB !== 'undefined' && firebaseDB.user) {
                    try {
                        const userData = await firebaseDB.getUserData();
                        const achievements = userData ? (userData.achievements || []) : [];
                        const ALL_ACHIEVEMENTS = [
                            { id: 'BOSS_SLAYER', title: 'BOSS SLAYER', desc: 'Defeated the Cyber Overlord.', icon: '🏆' },
                            { id: 'ELITE_PILOT', title: 'ELITE PILOT', desc: 'Reached Level 15.', icon: '⭐' }
                        ];

                        listEl.innerHTML = '';
                        ALL_ACHIEVEMENTS.forEach(ach => {
                            const isUnlocked = achievements.includes(ach.id);
                            const row = document.createElement('div');
                            row.className = `flex items-center gap-4 p-4 rounded-lg border ${isUnlocked ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface border-outline-variant/20 text-on-surface/40'}`;
                            row.innerHTML = `
                                <div class="text-4xl ${isUnlocked ? '' : 'grayscale opacity-50'}">${ach.icon}</div>
                                <div>
                                    <div class="font-headline font-bold text-lg">${ach.title}</div>
                                    <div class="font-body text-sm ${isUnlocked ? 'text-primary/70' : 'text-on-surface/40'}">${ach.desc}</div>
                                </div>
                                <div class="ml-auto font-headline font-bold text-xs tracking-widest ${isUnlocked ? 'text-tertiary' : 'text-on-surface/30'}">
                                    ${isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                                </div>
                            `;
                            listEl.appendChild(row);
                        });
                    } catch (err) {
                        listEl.innerHTML = '<div class="text-center text-error font-body py-8">Failed to load achievements.</div>';
                    }
                } else {
                    listEl.innerHTML = '<div class="text-center text-on-surface/50 font-body py-8">Please login to view achievements.</div>';
                }
            };
        }
        const btnCloseAchieve = document.getElementById('btn-close-achievements');
        if (btnCloseAchieve) {
            btnCloseAchieve.onclick = () => {
                document.getElementById('achievement-modal').classList.add('hidden');
            };
        }

        const btnPatch = document.getElementById('btn-patch-notes');
        if (btnPatch) {
            btnPatch.onclick = (e) => {
                e.preventDefault();
                document.getElementById('patch-note-modal').classList.remove('hidden');
                this.renderPatchNotes();
            };
        }
        document.getElementById('btn-close-patch-notes').onclick = () => {
            document.getElementById('patch-note-modal').classList.add('hidden');
        };

        const btnLeaderboard = document.getElementById('btn-leaderboard');
        if (btnLeaderboard) {
            btnLeaderboard.onclick = (e) => {
                e.preventDefault();
                document.getElementById('leaderboard-modal').classList.remove('hidden');
                this.renderLeaderboard();
            };
        }
        document.getElementById('btn-close-leaderboard').onclick = () => {
            document.getElementById('leaderboard-modal').classList.add('hidden');
        };

        this.state = 'TITLE';
        this.lastFrameTime = performance.now();
        this.fpsCap = 1000 / 60;

        // Firebase 초기화 및 로그인 버튼 연결
        if (typeof firebaseDB !== 'undefined') {
            firebaseDB.init();
            firebaseDB.onAuthChanged = (user) => {
                const nameEl = document.getElementById('player-name');
                const rankEl = document.getElementById('player-rank');
                const loginBtn = document.getElementById('btn-google-login');
                if (user) {
                    if (nameEl) nameEl.innerText = user.displayName || 'PILOT';
                    if (rankEl) rankEl.innerText = 'GOOGLE_LINKED';
                    if (loginBtn) { loginBtn.querySelector('span:last-child').innerText = 'LOGOUT'; }
                } else {
                    if (nameEl) nameEl.innerText = 'PLAYER_ID';
                    if (rankEl) rankEl.innerText = 'ELITE_PILOT';
                    if (loginBtn) { loginBtn.querySelector('span:last-child').innerText = 'GOOGLE LOGIN'; }
                }
            };
            document.getElementById('btn-google-login').onclick = async () => {
                if (firebaseDB.user) await firebaseDB.logout();
                else await firebaseDB.loginWithGoogle();
            };
        }

        // 기획서 [Step 3.1] 에 따라 페이지 로드 시 즉시 루프가 실행되지 않도록 여기서 requestAnimationFrame을 호출하지 않습니다.
    }
    showTutorial(onComplete) {
        const STEPS = [
            '안녕, 파일럿. 나는 <b style="color:#00daf3">MIKU</b> — 당신을 지원하는 전술 보조야. 간단하게 작전 브리핑을 시작할게.',
            '<b style="color:#00daf3">방향키</b>로 이동해. 끊임없이 움직이는 게 생존의 핵심이야. 멈추면 죽어.',
            '<b style="color:#00daf3">Z 키</b>로 전방을 공격해. 게임 시작 시 무기를 선택하고, 레벨업 때마다 강화할 수 있어.',
            '<b style="color:#00daf3">스페이스바</b>로 대시해. 대시 중엔 완전 무적이니까 위기 탈출이나 적 사이를 파고들 때 써.',
            '레벨업하면 <b style="color:#ffba38">아티팩트 카드</b>가 등장해. 무기를 강화하거나 보조 도구를 획득할 수 있어. 5스택마다 무기가 진화해.',
            '<b style="color:#ff4444">Lv.15</b>에 1차 보스, <b style="color:#ff4444">Lv.30</b>에 2차 보스가 출현해. 그 전까지 최대한 강해져야 해.',
            '좋아, 준비됐지? 두려움은 전장에 두고 와, 파일럿. 살아서 돌아와.',
        ];
        const overlay = document.getElementById('tutorial-overlay');
        const textEl = document.getElementById('tutorial-text');
        const dotsEl = document.getElementById('tutorial-dots');
        if (!overlay) { onComplete?.(); return; }
        overlay.classList.remove('hidden');
        overlay.style.pointerEvents = 'auto';
        try { const sfx = new Audio('Sound/Mikudayo sound.mp3'); sfx.volume = 0.8; sfx.play(); } catch(e) {}
        let step = 0;
        let typeTimer = null;
        dotsEl.innerHTML = STEPS.map((_, i) => `<div id="tdot-${i}" style="width:6px;height:6px;border-radius:50%;background:rgba(0,218,243,0.22);transition:background 0.2s;"></div>`).join('');
        const updateDots = (i) => STEPS.forEach((_, j) => {
            const d = document.getElementById(`tdot-${j}`);
            if (d) d.style.background = j === i ? '#00daf3' : j < i ? 'rgba(0,218,243,0.45)' : 'rgba(0,218,243,0.18)';
        });
        const typeWrite = (html) => {
            if (typeTimer) clearTimeout(typeTimer);
            // strip tags for char count, then reveal progressively
            const tmp = document.createElement('div'); tmp.innerHTML = html;
            const plain = tmp.textContent;
            let i = 0;
            const tick = () => {
                i = Math.min(i + 3, plain.length);
                // reveal html proportionally
                const frac = i / plain.length;
                const visLen = Math.round(html.length * frac);
                textEl.innerHTML = html.slice(0, visLen);
                if (i < plain.length) typeTimer = setTimeout(tick, 18);
            };
            textEl.innerHTML = '';
            tick();
        };
        const showStep = (i) => { updateDots(i); typeWrite(STEPS[i]); };
        const close = () => {
            if (typeTimer) clearTimeout(typeTimer);
            overlay.classList.add('hidden');
            overlay.style.pointerEvents = 'none';
            localStorage.setItem('aria_tutorial_seen', '1');
            window.removeEventListener('keydown', keyHandler);
            onComplete?.();
        };
        const advance = () => {
            if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; textEl.innerHTML = STEPS[step]; return; }
            step++;
            if (step >= STEPS.length) close();
            else showStep(step);
        };
        const keyHandler = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advance(); } };
        window.addEventListener('keydown', keyHandler);
        document.getElementById('tutorial-panel').onclick = advance;
        document.getElementById('tutorial-skip').onclick = (e) => { e.stopPropagation(); close(); };
        showStep(0);
    }
    init() {
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.enemies = []; this.gems = []; this.items = []; this.enemyProjectiles = []; this.score = 0; this.frameCount = 0; this.gameTime = 0;
        this.bossSpawned = false; this.bossDefeated = false; this.bossWarning = false;
        this.boss2Warning = false; this.boss2Spawned = false; this.boss2Defeated = false;
        this.infiniteModeActive = false; this.infiniteElapsedMinutes = 0;
        this.shockwave = null; this.recoveryShockwave = null; this.recoveryShockwaveUsed = false;
        this.bullets = []; this.droneMissiles = []; this.missileQueue = [];
        this.pendingEvents = []; this.screenShake = null; this.chargeEffect = null; this.xcaliburCharge = null; this.xBursts = [];
        this.infiniteAmbushTimer = 0; this.infiniteAmbushPending = false;
        this.updateHUD();
        this.ui.levelup.classList.add('hidden');
        this.state = 'PAUSED';
        this.ui.acquiredSkills.innerHTML = '';
        this.updateArtifactTray();
        this.audioManager.startBGM();
        this.showWeaponSelectMenu();
    }
    spawnEnemy() {
        const lv = this.player.level;
        if (lv >= 15 && !this.bossSpawned && !this.bossDefeated && !this.bossWarning) {
            this.bossWarning = true;
            this.enemyProjectiles = [];
            // 1. 충격파로 잡몹 소탕
            this.shockwave = { x: this.player.x, y: this.player.y, radius: 0, maxRadius: 2000, speed: 30 };
            // 2. 경고 사이렌 + Warning UI
            this.audioManager.playWarningAlarm();
            const warningEl = document.getElementById('boss-warning');
            warningEl.classList.remove('hidden');
            // 3. 3초 후 보스 실제 소환
            setTimeout(() => {
                warningEl.classList.add('hidden');
                const bx = this.canvas.width / 2, by = 120;
                this.enemies.push(new Enemy(bx, by, 'boss', lv));
                this.bossSpawned = true;
                this.audioManager.startBossBGM();
            }, 3000);
            return;
        }
        if (this.bossWarning && !this.bossSpawned) return; // 경고 중 스폰 차단
        if (this.bossSpawned && !this.bossDefeated) return;

        // ── 2차 보스: 글리치 위버 (Lv.30, 보스1 처치 이후) ──────────────────────
        if (lv >= 30 && this.bossDefeated && !this.boss2Spawned && !this.boss2Defeated && !this.boss2Warning) {
            this.boss2Warning = true;
            this.enemyProjectiles = [];
            this.shockwave = { x: this.player.x, y: this.player.y, radius: 0, maxRadius: 2000, speed: 30 };
            this.audioManager.playWarningAlarm();
            const warningEl = document.getElementById('boss-warning');
            warningEl.classList.remove('hidden');
            setTimeout(() => {
                warningEl.classList.add('hidden');
                this.enemies.push(new GlitchWeaver(this.canvas.width / 2, 160));
                this.boss2Spawned = true;
                this.audioManager.startBossBGM();
            }, 3000);
            return;
        }
        if (this.boss2Warning && !this.boss2Spawned) return;
        if (this.boss2Spawned && !this.boss2Defeated) return;
        const { x, y } = Utils.getSpawnPos(this.canvas.width, this.canvas.height);
        let type = 'normal';
        const r = Math.random();
        if (lv >= 12) {
            if (this.frameCount % 600 === 0) type = 'elite';
            else if (r < 0.3) type = 'bomber';
            else if (r < 0.5) type = 'ranged';
        } else if (lv >= 7) {
            if (r < 0.2) type = 'bomber';
            else if (r < 0.4) type = 'ranged';
        } else if (lv >= 3) {
            if (r < 0.25) type = 'ranged';
        }
        if (type === 'ranged' && this.enemies.filter(e => e.type === 'ranged').length >= 5) type = 'normal';

        if (this.infiniteModeActive) {
            // 시간 비례 복리 증가: 기본 4~6 + 1분마다 +2씩 누적
            const timeBonus = Math.floor(this.infiniteElapsedMinutes * 2);
            const spawnCount = Math.floor(Math.random() * 3) + 4 + timeBonus;
            for (let i = 0; i < spawnCount; i++) {
                const { x: sx, y: sy } = Utils.getSpawnPos(this.canvas.width, this.canvas.height);
                this.enemies.push(new Enemy(sx, sy, type, lv, this));
            }
        } else {
            // 일반 스테이지: 2마리 스폰, 최소 1마리는 normal 타입
            const { x: x2, y: y2 } = Utils.getSpawnPos(this.canvas.width, this.canvas.height);
            const type2 = (type === 'normal') ? type : 'normal';
            this.enemies.push(new Enemy(x, y, type, lv, this));
            this.enemies.push(new Enemy(x2, y2, type2, lv, this));
        }
    }
    showWeaponSelectMenu() {
        this.ui.levelup.classList.remove('hidden');
        this.ui.levelup.querySelector('h2').textContent = 'SELECT WEAPON';
        this.ui.cards.innerHTML = '';
        const weapons = ARTIFACT_POOL.filter(a => a.category === 'weapon' && a.tier === 1);
        weapons.forEach((art, index) => {
            const card = document.createElement('div'); card.className = 'skill-card grade-gold';
            card.innerHTML = `<div class="grade-badge gold">WEAPON</div><div class="skill-icon">${art.icon}</div><div class="skill-info"><div class="skill-title">${art.name} <span style="font-size:0.8em; color:#0ff; margin-left:10px;">[${index + 1}키]</span></div><div class="skill-desc">${art.desc}</div></div>`;
            card.onclick = () => {
                this.player.applyUpgrade(art.id);
                this.ui.levelup.querySelector('h2').textContent = 'SYSTEM UPGRADE';
                this.ui.levelup.classList.add('hidden');
                this.ui.cards.innerHTML = '';
                this.updateHUD(); this.updateArtifactTray();
                this.state = 'PLAYING';
            };
            this.ui.cards.appendChild(card);
        });
    }
    showLevelUpMenu() {
        this.state = 'PAUSED'; this.ui.levelup.classList.remove('hidden'); this.ui.cards.innerHTML = '';
        this.audioManager.playLevelUp();

        // 레벨별 등급 확률 결정
        const lv = this.player.level;
        const rollGrade = () => {
            const r = Math.random();
            if (lv >= 13) {
                if (r < 0.05) return 'prism';
                if (r < 0.30) return 'gold';
                if (r < 0.70) return 'silver';
                return 'bronze';
            } else if (lv >= 6) {
                if (r < 0.15) return 'gold';
                if (r < 0.50) return 'silver';
                return 'bronze';
            } else {
                return r < 0.20 ? 'silver' : 'bronze';
            }
        };

        // 후보 풀 구성
        const abilityPool = SKILL_POOL.filter(s => !(s.unique && this.player.has[s.id]));

        // 아티팩트 풀 구성
        const weaponDefId = this.player.weaponArtifact?.defId;
        const weaponDef = weaponDefId ? ARTIFACT_POOL.find(a => a.id === weaponDefId) : null;

        // 도구: 현재 장착 중인 도구(티어 무관) + 미획득 T1 도구
        const equippedToolIds = new Set(
            this.player.artifacts.filter(a => ARTIFACT_POOL.find(x => x.id === a.defId)?.category === 'tool').map(a => a.defId)
        );
        const toolDefs = [
            ...Array.from(equippedToolIds).map(id => ARTIFACT_POOL.find(a => a.id === id)).filter(Boolean),
            ...ARTIFACT_POOL.filter(a => a.tier === 1 && a.category === 'tool' && !equippedToolIds.has(a.id))
        ];

        // 드론: 5대 미만이거나 진화 가능한 경우만 표시
        const droneArt = this.player.artifacts.find(a => ARTIFACT_POOL.find(x => x.id === a.defId)?.category === 'drone');
        const droneDef = droneArt ? ARTIFACT_POOL.find(a => a.id === droneArt.defId) : null;
        const droneDefs = droneArt
            ? (this.player.drones.length < 5 || droneDef?.evolves_to ? [droneDef].filter(Boolean) : [])
            : ARTIFACT_POOL.filter(a => a.tier === 1 && a.category === 'drone');

        const availableArtifacts = [
            ...(weaponDef ? [weaponDef] : []),
            ...toolDefs,
            ...droneDefs
        ];

        const picks = [];
        for (let i = 0; i < 3; i++) {
            // 50% 확률로 아티팩트 vs 어빌리티
            const useArtifact = availableArtifacts.length > 0 && Math.random() < 0.5;
            if (useArtifact) {
                const artCandidates = availableArtifacts.filter(a => !picks.includes(a));
                if (artCandidates.length > 0) {
                    picks.push(artCandidates[Math.floor(Math.random() * artCandidates.length)]);
                    continue;
                }
            }
            let grade = rollGrade();
            let candidates = abilityPool.filter(s => s.grade === grade && !picks.includes(s));
            if (candidates.length === 0) { grade = grade === 'prism' ? 'gold' : grade === 'gold' ? 'silver' : 'bronze'; candidates = abilityPool.filter(s => s.grade === grade && !picks.includes(s)); }
            if (candidates.length === 0) candidates = abilityPool.filter(s => !picks.includes(s));
            if (candidates.length === 0) break;
            picks.push(candidates[Math.floor(Math.random() * candidates.length)]);
        }

        picks.forEach((skill, index) => {
            const isArt = !!skill.category;
            // 아티팩트: 현재 스택 확인하여 강화 수치 동적 표시
            let displayDesc = skill.desc;
            if (isArt && (skill.category === 'weapon' || skill.category === 'tool')) {
                const existing = this.player.artifacts.find(a => a.defId === skill.id);
                const stacks = existing ? existing.stacks : 0;
                if (stacks > 0) {
                    let bonus = ` <span style="color:#4ade80">[+${stacks * 10}% 강화 중`;
                    if (skill.category === 'tool') bonus += `, +${stacks * 2} 크기`;
                    bonus += `]</span>`;
                    displayDesc = skill.desc + bonus;
                }
            }
            const catLabel = { weapon: '🗡️ WEAPON', tool: '🔧 TOOL', drone: '🤖 DRONE' }[skill.category] || '';
            const gradeLabel = isArt ? catLabel : ({ bronze: '🥉 BRONZE', silver: '🥈 SILVER', gold: '🥇 GOLD', prism: '💎 PRISM' }[skill.grade] || '');
            const gradeClass = isArt ? (skill.category === 'drone' ? 'silver' : 'gold') : skill.grade;
            const card = document.createElement('div'); card.className = `skill-card grade-${gradeClass}`;
            card.innerHTML = `<div class="grade-badge ${gradeClass}">${gradeLabel}</div><div class="skill-icon">${skill.icon}</div><div class="skill-info"><div class="skill-title">${skill.name} <span style="font-size:0.8em; color:#0ff; margin-left:10px;">[${index + 1}키]</span></div><div class="skill-desc">${displayDesc}</div></div>`;
            card.onclick = () => {
                this.player.applyUpgrade(skill.id);
                if (!isArt) this.addAcquiredSkillUI(skill);
                this.ui.levelup.classList.add('hidden'); this.ui.cards.innerHTML = '';
                this.updateHUD(); this.updateArtifactTray();
                // 진화 연출 확인
                if (this.player.pendingEvolution) {
                    this.triggerEvolution(this.player.pendingEvolution);
                    this.player.pendingEvolution = null;
                } else {
                    this.state = 'PLAYING';
                }
            };
            this.ui.cards.appendChild(card);
        });
    }
    updateHUD() {
        this.ui.hp.style.width = (this.player.hp / this.player.maxHp * 100) + '%';
        this.ui.exp.style.width = (this.player.exp / this.player.maxExp * 100) + '%';
        this.ui.score.innerText = this.score; this.ui.level.innerText = this.player.level;
        this.ui.timer.innerText = `${String(Math.floor(this.gameTime / 60)).padStart(2, '0')}:${String(this.gameTime % 60).padStart(2, '0')}`;
    }
    showToast(message, icon = '🏆') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'bg-surface-container-high border border-primary/50 text-primary font-headline flex items-center gap-3 px-4 py-3 rounded shadow-[0_0_15px_rgba(0,218,243,0.3)] transform transition-all duration-300 translate-x-full opacity-0';
        toast.innerHTML = `<span class="text-2xl">${icon}</span> <span class="font-bold tracking-wider">${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));
        if (!this.lastFrameTime) this.lastFrameTime = timestamp;
        const elapsed = timestamp - this.lastFrameTime;
        if (elapsed < this.fpsCap) return;
        this.lastFrameTime = timestamp - (elapsed % this.fpsCap);
        this.playedHitThisFrame = false;
        this.playedExplosionThisFrame = false;
        const isPhase2 = this.bossDefeated;
        this.ctx.fillStyle = isPhase2 ? '#0a0412' : '#050510'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = isPhase2 ? '#313' : '#112'; this.ctx.lineWidth = 1; this.ctx.beginPath();
        for (let x = 0; x <= this.canvas.width; x += 40) { this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); }
        for (let y = 0; y <= this.canvas.height; y += 40) { const off = (this.frameCount * 0.5) % 40; this.ctx.moveTo(0, y + off); this.ctx.lineTo(this.canvas.width, y + off); }
        this.ctx.stroke();
        if (this.state === 'TITLE') { if (this.player) this.player.draw(this.ctx, this.frameCount); return; }
        if (this.state === 'EVOLVING') {
            this.gems.forEach(g => g.draw(this.ctx));
            this.enemies.forEach(e => e.draw(this.ctx, this.player.x, this.player.y));
            this.player.draw(this.ctx, this.frameCount);
            this.skillManager.updateAndDraw(this.ctx);
            // 진화 오버레이 렌더링
            if (this._evoData) {
                this._evoTimer = (this._evoTimer || 0) + 1;
                const prog = Math.min(1, this._evoTimer / 20);
                const ctx = this.ctx;
                ctx.save();
                ctx.globalAlpha = prog * 0.75;
                ctx.fillStyle = '#0a0020';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.globalAlpha = prog;
                ctx.textAlign = 'center';
                ctx.font = 'bold 90px Consolas';
                ctx.shadowBlur = 60; ctx.shadowColor = '#a78bfa';
                ctx.fillStyle = '#fff';
                ctx.fillText(this._evoData.icon, this.canvas.width / 2, this.canvas.height / 2 - 40);
                ctx.font = 'bold 48px Consolas';
                ctx.shadowColor = '#0ff';
                ctx.fillStyle = '#0ff';
                ctx.fillText('ARTIFACT EVOLVED!', this.canvas.width / 2, this.canvas.height / 2 + 40);
                ctx.font = 'bold 28px Consolas';
                ctx.fillStyle = '#a78bfa';
                ctx.fillText(this._evoData.name, this.canvas.width / 2, this.canvas.height / 2 + 90);
                ctx.restore();
                if (this._evoTimer >= 70) {
                    this.state = 'PLAYING';
                    this._evoData = null; this._evoTimer = 0;
                }
            }
            return;
        }
        if (this.state === 'PLAYER_DYING') {
            this.gems.forEach(g => g.draw(this.ctx)); this.enemies.forEach(e => e.draw(this.ctx, this.player.x, this.player.y)); this.enemyProjectiles.forEach(p => p.draw(this.ctx));
            if (--this.player.deathTimer <= 0) {
                this.state = 'GAMEOVER'; this.skillManager.createShatterParticles(this.player.x, this.player.y, this.player.neonColor); this.audioManager.playHit();
                setTimeout(() => {
                    this.ui.mainOverlay.classList.remove('hidden'); this.ui.gameUILayer.classList.add('hidden'); this.canvas.classList.add('hidden');
                    // Miku 다시 표시 및 로밍 재개
                    if (this.mikuEl) { this.mikuEl.style.display = ''; this._mikuScheduleRoam(); }
                    const title = this.ui.mainOverlay.querySelector('h1'), desc = this.ui.mainOverlay.querySelector('p');
                    if (title) title.innerText = "SYSTEM FAILED"; if (desc) desc.innerHTML = `LV: ${this.player.level} / 생존 시간: ${this.ui.timer.innerText} / 킬수: ${this.score}`;
                    this.ui.startBtn.innerText = "REBOOT SYSTEM";
                    // Firebase 최고 기록 갱신
                    if (typeof firebaseDB !== 'undefined' && firebaseDB.user) {
                        firebaseDB.updateHighScore(this.score, this.gameTime);
                    }
                }, 1000);
            }
            this.player.drawDeath(this.ctx); this.skillManager.updateAndDraw(this.ctx); return;
        }
        if (this.state === 'GAMEOVER') { this.gems.forEach(g => g.draw(this.ctx)); this.enemies.forEach(e => e.draw(this.ctx, this.player.x, this.player.y)); this.enemyProjectiles.forEach(p => p.draw(this.ctx)); this.skillManager.updateAndDraw(this.ctx); return; }
        if (this.state === 'PAUSED' || this.state === 'PAUSED_MENU') { this.gems.forEach(g => g.draw(this.ctx)); this.enemies.forEach(e => e.draw(this.ctx, this.player.x, this.player.y)); this.enemyProjectiles.forEach(p => p.draw(this.ctx)); this.player.draw(this.ctx, this.frameCount); this.skillManager.updateAndDraw(this.ctx); return; }
        this.frameCount++; if (this.frameCount % 60 === 0) { this.gameTime++; this.updateHUD(); }
        // 스크린 쉐이크
        if (this.screenShake && this.screenShake.duration > 0) {
            this.canvas.style.transform = `translate(${(Math.random()-0.5)*this.screenShake.intensity}px,${(Math.random()-0.5)*this.screenShake.intensity}px)`;
            if (--this.screenShake.duration <= 0) { this.screenShake = null; this.canvas.style.transform = ''; }
        }
        // 인피니티 모드 돌발 이벤트 — 3분(10800프레임)마다 위협 발생
        if (this.infiniteModeActive && !this.infiniteAmbushPending) {
            this.infiniteAmbushTimer++;
            if (this.infiniteAmbushTimer >= 10800) { this.infiniteAmbushTimer = 0; this.triggerInfiniteAmbush(); }
        }
        // pendingEvents 처리
        for (let i = this.pendingEvents.length - 1; i >= 0; i--) {
            const ev = this.pendingEvents[i];
            if (--ev.timer <= 0) { ev.fn(); this.pendingEvents.splice(i, 1); }
        }
        this.player.update(this.input);

        // Z키: 무기 아티팩트 기반 공격
        if (this.player.weaponArtifact) {
            const weapDef = ARTIFACT_POOL.find(a => a.id === this.player.weaponArtifact.defId);
            if (weapDef) {
                const atk = weapDef.attack;
                if (atk.type === 'cross_ultimate') {
                    // 엑스칼리버: 꾹 누르기 차징 메커니즘
                    if (this.input.keys.z) {
                        if (!this.xcaliburCharge && this.player.cooldown <= 0) {
                            const berserkActive = this.player.has.berserk && this.player.hp <= this.player.maxHp * 0.3;
                            const maxFrames = Math.round(atk.cooldown * 2.5 * (berserkActive ? 0.5 : 1));
                            this.xcaliburCharge = { frames: 0, maxFrames };
                            this.chargeEffect = { frames: 0, maxFrames, converging: true };
                            this.audioManager.playChargeStart();
                        }
                        if (this.xcaliburCharge) {
                            this.xcaliburCharge.frames++;
                            if (this.xcaliburCharge.frames >= this.xcaliburCharge.maxFrames) {
                                this.triggerCrossUltimate(atk);
                                this.xcaliburCharge = null;
                                this.chargeEffect = null;
                                this.player.cooldown = atk.cooldown;
                                this.audioManager.playChargeRelease();
                            }
                        }
                    } else {
                        // Z 키 뗌 → 차징 취소
                        if (this.xcaliburCharge) {
                            this.xcaliburCharge = null;
                            this.chargeEffect = null;
                        }
                    }
                } else if (this.input.keys.z && this.player.cooldown <= 0) {
                    const multishot = 0;
                    if (atk.type === 'melee_arc') {
                        this.triggerArtifactMeleeArc(atk, multishot);
                    } else if (atk.type === 'full_circle') {
                        this.triggerArtifactFullCircle(atk);
                    } else if (atk.type === 'bullet') {
                        this.triggerArtifactBullet(atk, multishot);
                    } else if (atk.type === 'x_shape') {
                        this.triggerXShape(atk);
                        this.audioManager.playDominionStrike();
                    } else if (atk.type === 'x_linger_explode') {
                        this.triggerXLingerExplode(atk);
                        this.audioManager.playAnnihilationStrike();
                    } else if (atk.type === 'cross_combo') {
                        this.triggerCrossCombo(atk);
                    } else if (atk.type === 'bullet_burst') {
                        this.triggerBulletBurst(atk, multishot);
                    } else if (atk.type === 'piercing_laser') {
                        this.triggerPiercingLaser(atk);
                    }
                    if (atk.type !== 'x_shape' && atk.type !== 'x_linger_explode') {
                        this.audioManager.playSwordSlash();
                    }
                    this.player.cooldown = atk.cooldown;
                }
            }
        }
        // 무한 모드 경과 시간 추적 (매 60초마다 증가)
        if (this.infiniteModeActive && this.frameCount % 3600 === 0) {
            this.infiniteElapsedMinutes++;
            if (this.infiniteElapsedMinutes % 5 === 0) this.showToast(`THREAT LEVEL ${this.infiniteElapsedMinutes}`, '⚠️');
        }
        const baseInterval = Math.max(25, 60 - (this.player.level * 2));
        const infiniteInterval = Math.max(5, 20 - Math.floor(this.infiniteElapsedMinutes * 2));
        const spawnInterval = this.infiniteModeActive ? infiniteInterval
                            : this.bossDefeated ? Math.max(12, Math.floor(baseInterval / 2))
                            : baseInterval;
        if (this.frameCount % spawnInterval === 0) this.spawnEnemy();
        this.enemyProjectiles.forEach((p, i) => { p.update(this.player, this); p.draw(this.ctx); if (p.state === 'DONE') this.enemyProjectiles.splice(i, 1); });

        // 드론 아티팩트 공격 처리 (ArtifactDrone 기반)
        this.player.drones.forEach(d => {
            if (!d.readyToFire) return;
            const def = d.def?.attack;
            if (!def) return;
            const range = def.range || 350;
            if (def.type === 'drone_missile') {
                // 불법 드론: 사거리 내 가장 가까운 적 1명 유도 미사일
                let closest = null, closestDist = range;
                this.enemies.forEach(e => {
                    const dd = Utils.dist(d.x, d.y, e.x, e.y);
                    if (dd < closestDist) { closestDist = dd; closest = e; }
                });
                if (closest) {
                    const count = this.player.droneBulletCount;
                    for (let k = 0; k < count; k++)
                        this.missileQueue.push({ framesLeft: k * 4, drone: d, target: closest, ratio: def.damageRatio });
                }
            } else if (def.type === 'drone_carpet') {
                // 군용 드론: burstCount개 무작위 타겟 동시 발사
                const burstCount = (def.burstCount || 4) + this.player.droneBulletCount - 1;
                const nearby = this.enemies.filter(e => Utils.dist(d.x, d.y, e.x, e.y) < range)
                    .sort(() => Math.random() - 0.5);
                for (let k = 0; k < burstCount; k++) {
                    const tgt = k < nearby.length
                        ? nearby[k]
                        : { x: Math.random() * CONFIG.CANVAS_WIDTH, y: Math.random() * CONFIG.CANVAS_HEIGHT };
                    this.missileQueue.push({ framesLeft: k * 3, drone: d, target: tgt, ratio: def.damageRatio });
                }
            }
            d.resetCooldown(this.player);
        });

        // 도구(Tool) 아티팩트 자동 사격
        this.player.artifacts.filter(a => a.category === 'tool').forEach(toolArt => {
            const def = ARTIFACT_POOL.find(d => d.id === toolArt.defId);
            if (!def) return;
            if (toolArt.cooldown > 0) { toolArt.cooldown--; return; }
            const atk = def.attack;
            const cooldown = Math.max(15, Math.round(atk.cooldown * (1 - this.player.toolFireRateBonus)));
            // 사거리 내 가장 가까운 적 탐색
            let nearest = null, nearestDist = atk.range || 350;
            this.enemies.forEach(e => {
                const dd = Utils.dist(this.player.x, this.player.y, e.x, e.y);
                if (dd < nearestDist) { nearestDist = dd; nearest = e; }
            });
            if (nearest) {
                const stacks = toolArt.stacks || 1;
                const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
                const finalSize = atk.size + (stacks - 1) * 2;
                const baseAngle = Utils.angle(this.player.x, this.player.y, nearest.x, nearest.y);
                const isCrit = Math.random() < this.player.critChance;
                const dmg = Math.floor(this.player.attackDamage * effectiveRatio * (isCrit ? this.player.critMultiplier : 1));
                const count = this.player.toolBulletCount || 1;
                const spreadStep = 0.2;
                for (let k = 0; k < count; k++) {
                    const offset = count > 1 ? (k - (count - 1) / 2) * spreadStep : 0;
                    const angle = baseAngle + offset;
                    if (atk.type === 'auto_aoe_bullet') {
                        // 폭발 수리검: 폭발 투사체
                        const b = new Bullet(this.player.x, this.player.y, angle, dmg, isCrit ? '#fff' : '#f80', atk.speed, finalSize, isCrit);
                        b.aoeRadius = atk.aoeRadius;
                        b.isAoe = true;
                        if (toolArt.defId === 'bomb_shuriken') { b.isShuriken = true; b.spinAngle = 0; b.isBombShuriken = true; }
                        this.bullets.push(b);
                    } else {
                        const sb = new Bullet(this.player.x, this.player.y, angle, dmg, isCrit ? '#fff' : '#ffe050', atk.speed, finalSize, isCrit, !!atk.piercing);
                        if (toolArt.defId === 'shuriken') { sb.isShuriken = true; sb.spinAngle = 0; }
                        this.bullets.push(sb);
                    }
                }
                this.audioManager.playMissileLaunch();
            }
            toolArt.cooldown = cooldown;
        });

        // 발사 큐 처리 — 프레임마다 카운트다운, 0 되면 실제 발사
        for (let i = this.missileQueue.length - 1; i >= 0; i--) {
            const q = this.missileQueue[i];
            if (--q.framesLeft <= 0) {
                this.droneMissiles.push(new DroneMissile(q.drone.x, q.drone.y, q.target, q.ratio, true));
                this.audioManager.playMissileLaunch();
                this.missileQueue.splice(i, 1);
            }
        }

        // 드론 미사일 업데이트 및 충돌 처리
        for (let i = this.droneMissiles.length - 1; i >= 0; i--) {
            const m = this.droneMissiles[i];
            m.update(); m.draw(this.ctx);
            if (m.x < -60 || m.x > this.canvas.width + 60 || m.y < -60 || m.y > this.canvas.height + 60) {
                this.droneMissiles.splice(i, 1); continue;
            }
            // 비유도: 비행 중 적 충돌 체크
            if (m.collidesWithEnemy(this.enemies)) { this.explodeMissile(m); this.droneMissiles.splice(i, 1); continue; }
            if (m.hitCheck()) { this.explodeMissile(m); this.droneMissiles.splice(i, 1); }
        }

        // 보스 전조 충격파 렌더링 및 적 소탕
        if (this.shockwave) {
            const sw = this.shockwave;
            sw.radius += sw.speed;
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255, 100, 100, ${1 - sw.radius / sw.maxRadius})`;
            this.ctx.lineWidth = 4;
            this.ctx.shadowBlur = 20; this.ctx.shadowColor = '#f00';
            this.ctx.stroke();
            this.ctx.restore();
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                if (e.type !== 'boss' && Utils.dist(sw.x, sw.y, e.x, e.y) < sw.radius) {
                    this.skillManager.createParticles(e.x, e.y, e.color);
                    this.enemies.splice(i, 1);
                }
            }
            if (sw.radius >= sw.maxRadius) this.shockwave = null;
        }

        // 리커버리 충격파 렌더링
        if (this.recoveryShockwave) {
            const rs = this.recoveryShockwave;
            rs.radius += 50;
            this.ctx.save();
            this.ctx.beginPath(); this.ctx.arc(rs.x, rs.y, rs.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - rs.radius / 2000)})`;
            this.ctx.lineWidth = 8; this.ctx.shadowBlur = 30; this.ctx.shadowColor = '#fff';
            this.ctx.stroke(); this.ctx.restore();
            // 주변 적 파괴
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                if (Utils.dist(rs.x, rs.y, this.enemies[i].x, this.enemies[i].y) < rs.radius) {
                    this.killEnemy(this.enemies[i]);
                    this.enemies.splice(i, 1);
                }
            }
            if (rs.radius >= 2000) this.recoveryShockwave = null;
        }

        // 블랙홀 렌더링 및 흡수/데미지
        if (this.player.blackholes.length > 0) {
            for (let i = this.player.blackholes.length - 1; i >= 0; i--) {
                const bh = this.player.blackholes[i];
                if (bh.life <= 0) { this.player.blackholes.splice(i, 1); continue; }
                bh.life--;
                const bhRadius = 60;
                // 시각
                this.ctx.save();
                this.ctx.beginPath(); this.ctx.arc(bh.x, bh.y, bhRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(10,0,30,${0.5 + 0.3 * Math.sin(bh.life * 0.2)})`;
                this.ctx.shadowBlur = 30; this.ctx.shadowColor = '#80f';
                this.ctx.fill();
                this.ctx.strokeStyle = '#80f'; this.ctx.lineWidth = 2; this.ctx.stroke();
                this.ctx.restore();
                // 주변 적 흡수 + 지속 데미지
                if (bh.life % 10 === 0) {
                    this.enemies.forEach(en => {
                        const dd = Utils.dist(bh.x, bh.y, en.x, en.y);
                        if (dd < 200) {
                            // 끌어당김
                            const ang = Utils.angle(en.x, en.y, bh.x, bh.y);
                            en.x += Math.cos(ang) * 4; en.y += Math.sin(ang) * 4;
                        }
                        if (dd < bhRadius) {
                            en.hp -= 5; this.skillManager.createFloatingText(en.x, en.y - 10, '5', false, '#80f');
                        }
                    });
                    // 젬도 흡수
                    this.gems.forEach(g => { if (Utils.dist(bh.x, bh.y, g.x, g.y) < 200) g.isAttracted = true; });
                }
            }
        }

        this.skillManager.attacks.forEach(atk => {
            if (atk.life >= atk.maxLife - 3) {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const e = this.enemies[j]; const d = Utils.dist(e.x, e.y, atk.x, atk.y);
                    if (d < atk.radius + e.radius) {
                        const a = Utils.angle(this.player.x, this.player.y, e.x, e.y);
                        let isHit = false;
                        if (atk.isFullCircle) isHit = true;
                        else if (atk.isLinear) {
                            const dx = e.x - (atk.x - Math.cos(atk.angle) * atk.radius / 2), dy = e.y - (atk.y - Math.sin(atk.angle) * atk.radius / 2);
                            const rx = dx * Math.cos(-atk.angle) - dy * Math.sin(-atk.angle), ry = dx * Math.sin(-atk.angle) + dy * Math.cos(-atk.angle);
                            if (rx > 0 && rx < atk.radius && Math.abs(ry) < (atk.halfWidth||20) + e.radius) isHit = true;
                        } else {
                            let diff = Math.abs(atk.angle - a); if (diff > Math.PI) diff = Math.PI * 2 - diff;
                            if (diff < (atk.arcAngle || Math.PI / 1.5)) isHit = true;
                        }
                        if (isHit) {
                            if (atk.hitTargets.has(e)) continue;
                            atk.hitTargets.add(e);
                            e.knockbackX = Math.cos(a) * (atk.isFullCircle ? 25 : 15); e.knockbackY = Math.sin(a) * (atk.isFullCircle ? 25 : 15);
                            if (this.processHit(e, atk.damage, atk.isCrit, '#fff')) this.enemies.splice(j, 1);
                        }
                    }
                }
            }
        });

        // 아이템 처리 (자석 등)
        this.items.forEach((item, i) => {
            item.update(this.player);
            item.draw(this.ctx);
            if (item.isCollected) {
                this.items.splice(i, 1);
                if (item instanceof Magnet) {
                    this.showToast('MAGNET ACTIVATED', '🧲');
                    this.gems.forEach(g => g.isAttracted = true);
                }
            }
        });

        this.gems.forEach((g, i) => { g.update(this.player); g.draw(this.ctx); if (g.isCollected) { this.gems.splice(i, 1); this.audioManager.playGem(); if (this.player.gainExp(g.expValue)) this.showLevelUpMenu(); this.updateHUD(); } });
        this.enemies.forEach((e, i) => {
            e.update(this.player, this);
            if (e.hp <= 0) {
                this.killEnemy(e);
                this.enemies.splice(i, 1); return;
            }
            e.draw(this.ctx, this.player.x, this.player.y);
            if (Utils.dist(this.player.x, this.player.y, e.x, e.y) < this.player.radius + e.radius && !this.player.isDashing && this.player.invincible <= 0) {
                if (this.player.takeDamage(e.contactDamage || 10)) { this.triggerGameOver(); } else { this.checkRecoveryTrigger(); } this.updateHUD();
            }
        });
        // 탄환 (거너 / 오버로드) 처리
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(); b.draw(this.ctx);
            if (!b.isAlive) { this.bullets.splice(i, 1); continue; }
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (b.hitTargets.has(e)) continue;
                if (Utils.dist(b.x, b.y, e.x, e.y) < e.radius + b.size) {
                    b.hitTargets.add(e);
                    // AoE 탄 (폭발 수리검 등): 범위 피해
                    if (b.isAoe && b.aoeRadius) {
                        for (let jj = this.enemies.length - 1; jj >= 0; jj--) {
                            const ae = this.enemies[jj];
                            if (Utils.dist(b.x, b.y, ae.x, ae.y) < b.aoeRadius) {
                                if (this.processHit(ae, b.damage, b.isCrit, '#f80', false)) this.enemies.splice(jj, 1);
                            }
                        }
                        this.skillManager.createParticles(b.x, b.y, '#f80');
                        b.isAlive = false; break;
                    }
                    if (this.processHit(e, b.damage, b.isCrit, b.color)) this.enemies.splice(j, 1);
                    if (!b.piercing) { b.isAlive = false; break; }
                }
            }
        }

        this.player.draw(this.ctx, this.frameCount); this.skillManager.updateAndDraw(this.ctx);
        // 소멸(T4) X 폭발 이펙트
        for (let i = this.xBursts.length - 1; i >= 0; i--) {
            const b = this.xBursts[i];
            if (--b.life <= 0) { this.xBursts.splice(i, 1); continue; }
            const t = 1 - b.life / b.maxLife; // 0→1
            const alpha = b.life / b.maxLife;
            const ctx = this.ctx;
            ctx.save();
            // 확장하는 충격파 링
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * t * 1.1, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,30,30,${alpha * 0.7})`;
            ctx.lineWidth = 6 * alpha;
            ctx.shadowBlur = 25; ctx.shadowColor = '#f00';
            ctx.stroke();
            // 두 번째 링 (살짝 느리게)
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * t * 0.75, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,100,0,${alpha * 0.5})`;
            ctx.lineWidth = 3 * alpha;
            ctx.shadowBlur = 18; ctx.shadowColor = '#f50';
            ctx.stroke();
            // X자 빔 4개 (확장)
            const beamLen = b.radius * (0.3 + t * 0.9);
            ctx.lineWidth = (8 - t * 6) * alpha;
            ctx.shadowBlur = 30; ctx.shadowColor = '#f00';
            for (let k = 0; k < 4; k++) {
                const a = b.angle + (k * Math.PI / 2) + Math.PI / 4;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(b.x + Math.cos(a) * beamLen, b.y + Math.sin(a) * beamLen);
                ctx.strokeStyle = `rgba(255,${Math.floor(50 + (1-t)*150)},0,${alpha * 0.9})`;
                ctx.stroke();
            }
            // 중심 플래시 (초반에만)
            if (t < 0.35) {
                const flashA = (0.35 - t) / 0.35;
                ctx.beginPath();
                ctx.arc(b.x, b.y, 18 + t * 40, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,80,0,${flashA * 0.6})`;
                ctx.shadowBlur = 50; ctx.shadowColor = '#f00';
                ctx.fill();
            }
            ctx.restore();
        }
        // 엑스칼리버 차징 이펙트
        if (this.chargeEffect && this.xcaliburCharge) {
            const progress = Math.min(1, this.xcaliburCharge.frames / this.xcaliburCharge.maxFrames);
            const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 14);
            const ctx = this.ctx;
            ctx.save();
            // 수렴형 링 3겹 (바깥→안으로 좁혀짐)
            for (let r = 0; r < 3; r++) {
                const rp = 1 - (progress + r / 3) % 1; // 반전: 큰 → 작은
                const radius = 22 + rp * 140;
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,200,${rp * 0.75 * pulse})`;
                ctx.lineWidth = 2 + (1 - rp) * 5;
                ctx.shadowBlur = 22; ctx.shadowColor = '#fffaaa';
                ctx.stroke();
            }
            // 중심 글로우 (차징 완료에 가까울수록 밝아짐)
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, 14 + progress * 28, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${progress * 0.40 * pulse})`;
            ctx.shadowBlur = 40; ctx.shadowColor = '#fff';
            ctx.fill();
            // 게이지 바 (플레이어 위 작은 막대)
            const barW = 60, barH = 5;
            const bx = this.player.x - barW / 2, by = this.player.y - 36;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx, by, barW, barH);
            ctx.fillStyle = `rgba(255,255,${Math.floor(progress * 255)},0.9)`;
            ctx.fillRect(bx, by, barW * progress, barH);
            ctx.restore();
        }
    }
    explodeMissile(m) {
        // 폭발 파티클
        for (let k = 0; k < 5; k++) this.skillManager.createParticles(m.x, m.y, k % 2 === 0 ? '#f7d774' : '#f80');
        if (!this.playedExplosionThisFrame) { this.audioManager.playMissileExplosion(); this.playedExplosionThisFrame = true; }
        // 크리티컬 판정
        const isCrit = Math.random() < this.player.critChance;
        let dmg = this.player.attackDamage * m.damageRatio;
        if (isCrit) dmg *= this.player.critMultiplier;
        dmg = Math.floor(dmg);
        // AoE 범위 내 적에게 일반공격과 동일한 processHit 적용
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (Utils.dist(m.x, m.y, e.x, e.y) >= m.aoeRadius) continue;
            if (this.processHit(e, dmg, isCrit, '#f7d774', false)) this.enemies.splice(i, 1);
        }
    }
    killEnemy(e) {
        const gv = e.type === 'ranged' ? 3 : (e.type === 'bomber' ? 5 : (e.type === 'elite' ? 10 : 1));
        this.skillManager.createParticles(e.x, e.y, e.color);
        if (e.type === 'elite') {
            this.items.push(new Magnet(e.x, e.y));
            for (let k = 0; k < 5; k++) this.gems.push(new Gem(e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, gv));
        } else if (e.type === 'boss') {
            for (let k = 0; k < 30; k++) this.gems.push(new Gem(e.x + Math.random() * 80 - 40, e.y + Math.random() * 80 - 40, 5));
            for (let pk = 0; pk < 150; pk++) this.skillManager.createParticles(e.x, e.y, Math.random() > .5 ? '#fbc531' : (Math.random() > .5 ? '#f00' : '#fa0'));
            if (e.isAmbush) {
                this.audioManager.startBGM();
                this.showToast('AMBUSH REPELLED', '🏆');
            } else if (!this.bossDefeated) {
                this.bossDefeated = true;
                if (this.audioManager.startBGM) this.audioManager.startBGM();
                this.showToast('ACHIEVEMENT UNLOCKED: BOSS SLAYER', '🏆');
                this.showToast('PHASE 2: VOID EROSION BEGINS', '🌌');
                if (typeof firebaseDB !== 'undefined') firebaseDB.updateAchievement('BOSS_SLAYER');
            }
        } else if (e.type === 'glitch_weaver' && !this.boss2Defeated) {
            this.boss2Defeated = true; this.infiniteModeActive = true;
            for (let k = 0; k < 60; k++) this.gems.push(new Gem(e.x + Math.random() * 100 - 50, e.y + Math.random() * 100 - 50, 5));
            for (let pk = 0; pk < 200; pk++) this.skillManager.createParticles(e.x, e.y, Math.random() > .5 ? '#0ff' : (Math.random() > .5 ? '#f0f' : '#fff'));
            if (this.audioManager.startBGM) this.audioManager.startBGM();
            this.showToast('GLITCH WEAVER DEFEATED', '⚡');
            this.showToast('INFINITE MODE: ACTIVATED', '⚠️');
        } else {
            this.gems.push(new Gem(e.x, e.y, gv));
        }
        this.score++;
        this.player.killCount++;
        if (this.player.has.kill_atk && this.player.killCount % 100 === 0) {
            this.player.attackDamage++;
            this.skillManager.createFloatingText(this.player.x, this.player.y - 30, 'ATK +1', false, '#fbbf24');
        }
        if (this.player.has.kill_hp && this.player.killCount % 100 === 0) {
            this.player.maxHp += 100;
            this.skillManager.createFloatingText(this.player.x, this.player.y - 20, '+100 MAX HP', false, '#4ade80');
        }
        if (this.player.vampireChance > 0 && Math.random() < this.player.vampireChance && this.player.hp < this.player.maxHp) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
            this.skillManager.createFloatingText(this.player.x, this.player.y - 20, '+3', false, '#4ade80');
        }
        this.updateHUD();
    }
    drawLightningLine(x1, y1, x2, y2) {
        this.ctx.save();
        this.ctx.beginPath(); this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = 'rgba(255,220,0,0.4)'; this.ctx.lineWidth = 8; this.ctx.shadowBlur = 25; this.ctx.shadowColor = '#ff0'; this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 2; this.ctx.shadowBlur = 12; this.ctx.shadowColor = '#ff0'; this.ctx.stroke();
        this.ctx.restore();
    }
    // 모든 공격 경로에서 공유하는 피격 처리 (HP 감소 + 어빌리티 발동 + 킬 처리)
    // 반환값: true = 적 사망 (호출측에서 enemies 배열에서 제거 필요)
    processHit(e, dmg, isCrit, color = '#0ff', particles = true) {
        e.hp -= dmg;
        this.skillManager.createFloatingText(e.x, e.y - 10, dmg, isCrit, color);
        if (particles) this.skillManager.createParticles(e.x, e.y, color);
        if (!this.playedHitThisFrame) { this.audioManager.playHit(); this.playedHitThisFrame = true; }
        if (isCrit) this.applyChainLightning(e, true);
        if (this.player.has.blackhole && Math.random() < 0.01) {
            this.player.blackholes.push({ x: e.x, y: e.y, life: 180, maxLife: 180 });
        }
        if (e.hp <= 0) { this.killEnemy(e); return true; }
        return false;
    }
    applyChainLightning(source, drawLine = false) {
        if (this.player.chainLightningStacks <= 0) return;
        const lightningDmg = 10 * this.player.chainLightningStacks;
        const targets = this.enemies.filter(t => t !== source && t.hp > 0)
            .sort((a, b) => Utils.dist(source.x, source.y, a.x, a.y) - Utils.dist(source.x, source.y, b.x, b.y))
            .slice(0, 3);
        targets.forEach(t => {
            t.hp -= lightningDmg;
            this.skillManager.createFloatingText(t.x, t.y - 10, Math.round(lightningDmg), false, '#ff0');
            this.skillManager.createParticles(t.x, t.y, '#ff0');
            if (drawLine) this.drawLightningLine(source.x, source.y, t.x, t.y);
        });
    }
    triggerArtifactMeleeArc(atk, multishot) {
        const p = this.player;
        const range = atk.range + p.attackRange - CONFIG.PLAYER.ATTACK_RANGE;
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        const count = 1 + (multishot || 0);
        for (let i = 0; i < count; i++) {
            const angleOffset = (i - (count - 1) / 2) * 0.3;
            const isCrit = Math.random() < p.critChance;
            const finalDmg = Math.floor(p.attackDamage * effectiveRatio * (isCrit ? p.critMultiplier : 1));
            const angle = Math.atan2(p.dirY, p.dirX) + angleOffset;
            this.skillManager.attacks.push({
                x: p.x + Math.cos(angle) * (range / 2),
                y: p.y + Math.sin(angle) * (range / 2),
                radius: range, angle, arcAngle: atk.arc || Math.PI / 1.5,
                life: 12, maxLife: 12, damage: finalDmg, isCrit,
                isFullCircle: false, isLinear: false, hitTargets: new Set()
            });
            if (isCrit) this.applyChainLightning({ x: p.x, y: p.y });
        }
    }
    triggerArtifactFullCircle(atk) {
        const p = this.player;
        const range = atk.range + (p.attackRange - CONFIG.PLAYER.ATTACK_RANGE) * 0.5;
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        const isCrit = Math.random() < p.critChance;
        const finalDmg = Math.floor(p.attackDamage * effectiveRatio * (isCrit ? p.critMultiplier : 1));
        this.skillManager.attacks.push({
            x: p.x, y: p.y, radius: range, angle: 0,
            life: 14, maxLife: 14, damage: finalDmg, isCrit,
            isFullCircle: true, isLinear: false, hitTargets: new Set()
        });
        if (isCrit) this.applyChainLightning({ x: p.x, y: p.y });
    }
    triggerArtifactBullet(atk, multishot) {
        const p = this.player;
        let nearest = null, nearestDist = Infinity;
        this.enemies.forEach(e => { const d = Utils.dist(p.x, p.y, e.x, e.y); if (d < nearestDist) { nearestDist = d; nearest = e; } });
        if (!nearest) return;
        const count = 1 + (multishot || 0);
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        for (let i = 0; i < count; i++) {
            const angleOffset = (i - (count - 1) / 2) * 0.15;
            const baseAngle = Utils.angle(p.x, p.y, nearest.x, nearest.y) + angleOffset;
            const isCrit = Math.random() < p.critChance;
            const dmg = Math.floor(p.attackDamage * effectiveRatio * (isCrit ? p.critMultiplier : 1));
            const color = isCrit ? '#fff' : '#ff0';
            this.bullets.push(new Bullet(p.x, p.y, baseAngle, dmg, color, atk.speed, atk.size, isCrit));
            if (isCrit) this.applyChainLightning(nearest, true);
        }
    }
    triggerXShape(atk) {
        const p = this.player;
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        const range = atk.range + p.attackRange - CONFIG.PLAYER.ATTACK_RANGE;
        // 사거리 내 가장 가까운 적 타겟, 없으면 플레이어 위치
        let tx = p.x, ty = p.y;
        let closestDist = range, closest = null;
        this.enemies.forEach(e => {
            const d = Utils.dist(p.x, p.y, e.x, e.y);
            if (d < closestDist) { closestDist = d; closest = e; }
        });
        if (closest) { tx = closest.x; ty = closest.y; }
        const baseAngle = Math.atan2(p.dirY, p.dirX);
        const isCrit = Math.random() < p.critChance;
        const finalDmg = Math.floor(p.attackDamage * effectiveRatio * (isCrit ? p.critMultiplier : 1));
        // 두 획 동시 생성 (X자)
        this.skillManager.attacks.push({ x: tx, y: ty, radius: range, angle: baseAngle + Math.PI / 4, life: 14, maxLife: 14, damage: finalDmg, isCrit, isFullCircle: false, isLinear: true, hitTargets: new Set() });
        this.skillManager.attacks.push({ x: tx, y: ty, radius: range, angle: baseAngle - Math.PI / 4, life: 14, maxLife: 14, damage: finalDmg, isCrit, isFullCircle: false, isLinear: true, hitTargets: new Set() });
        if (isCrit) this.applyChainLightning({ x: tx, y: ty });
    }
    triggerXLingerExplode(atk) {
        const p = this.player;
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        const range = atk.range + p.attackRange - CONFIG.PLAYER.ATTACK_RANGE;
        // 사거리 내 가장 가까운 적 타겟, 없으면 플레이어 위치
        let tx = p.x, ty = p.y;
        let closestDist = range, closest = null;
        this.enemies.forEach(e => {
            const d = Utils.dist(p.x, p.y, e.x, e.y);
            if (d < closestDist) { closestDist = d; closest = e; }
        });
        if (closest) { tx = closest.x; ty = closest.y; }
        const baseAngle = Math.atan2(p.dirY, p.dirX);
        const isCrit = Math.random() < p.critChance;
        const finalDmg = Math.floor(p.attackDamage * effectiveRatio * (isCrit ? p.critMultiplier : 1));
        // 두 획 동시 생성 (X자, 빨간색)
        this.skillManager.attacks.push({ x: tx, y: ty, radius: range, angle: baseAngle + Math.PI / 4, life: 30, maxLife: 30, damage: finalDmg, isCrit, isFullCircle: false, isLinear: true, color: '#f00', hitTargets: new Set() });
        this.skillManager.attacks.push({ x: tx, y: ty, radius: range, angle: baseAngle - Math.PI / 4, life: 30, maxLife: 30, damage: finalDmg, isCrit, isFullCircle: false, isLinear: true, color: '#f00', hitTargets: new Set() });
        const expRatio = atk.explosionRatio || 5.0;
        const expRadius = atk.explosionRadius || 220;
        this.pendingEvents.push({ timer: 30, fn: () => {
            const isCrit2 = Math.random() < p.critChance;
            const expDmg = Math.floor(p.attackDamage * expRatio * (isCrit2 ? p.critMultiplier : 1));
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (Utils.dist(tx, ty, this.enemies[j].x, this.enemies[j].y) < expRadius)
                    if (this.processHit(this.enemies[j], expDmg, isCrit2, '#f00')) this.enemies.splice(j, 1);
            }
            // X 폭발 이펙트 (빨간색)
            this.xBursts.push({ x: tx, y: ty, angle: baseAngle, life: 30, maxLife: 30, radius: expRadius });
            // 방사형 빨간 파티클 (8방향)
            for (let k = 0; k < 16; k++) {
                const a = (k / 16) * Math.PI * 2;
                const spd = 4 + Math.random() * 6;
                this.skillManager.particles.push({ x: tx, y: ty, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 1.0, decay: 0.03 + Math.random() * 0.02, color: k % 3 === 0 ? '#fff' : (k % 2 === 0 ? '#ff4444' : '#ff0000'), size: 2 + Math.random() * 4 });
            }
            this.audioManager.playAnnihilationExplosion();
        }});
    }
    triggerCrossCombo(atk) {
        const p = this.player;
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        const range = atk.range + p.attackRange - CONFIG.PLAYER.ATTACK_RANGE;
        const px = p.x, py = p.y;
        // 1타: 전체 범위 원형 (기본 검)
        const isCrit1 = Math.random() < p.critChance;
        const dmg1 = Math.floor(p.attackDamage * effectiveRatio * (isCrit1 ? p.critMultiplier : 1));
        this.skillManager.attacks.push({ x: px, y: py, radius: range, angle: 0, life: 14, maxLife: 14, damage: dmg1, isCrit: isCrit1, isFullCircle: true, isLinear: false, hitTargets: new Set() });
        if (isCrit1) this.applyChainLightning({ x: px, y: py });
        // 2타: 십자가 (수평 + 수직 선형) — 화면 크기 기준 대형 십자가
        const crossRadius = CONFIG.CANVAS_HEIGHT * 0.9;
        this.pendingEvents.push({ timer: 10, fn: () => {
            this.audioManager.playCrossSlash();
            const isCrit2 = Math.random() < p.critChance;
            const dmg2 = Math.floor(p.attackDamage * effectiveRatio * (isCrit2 ? p.critMultiplier : 1));
            this.skillManager.attacks.push({ x: px, y: py, radius: crossRadius, angle: 0,          life: 14, maxLife: 14, damage: dmg2, isCrit: isCrit2, isFullCircle: false, isLinear: true, halfWidth: 50, hitTargets: new Set() });
            this.skillManager.attacks.push({ x: px, y: py, radius: crossRadius, angle: Math.PI / 2, life: 14, maxLife: 14, damage: dmg2, isCrit: isCrit2, isFullCircle: false, isLinear: true, halfWidth: 50, hitTargets: new Set() });
            if (isCrit2) this.applyChainLightning({ x: px, y: py });
        }});
    }
    triggerCrossUltimate(atk) {
        // 차징 완료 시 호출: 1·2·3타 연속 Ultimate Combo 발동
        const p = this.player;
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        const slashRatio = atk.slashRatio || 6.0;
        const range = atk.range + p.attackRange - CONFIG.PLAYER.ATTACK_RANGE;
        const px = p.x, py = p.y;
        // 1타: 전체 범위 원형
        const isCrit1 = Math.random() < p.critChance;
        const dmg1 = Math.floor(p.attackDamage * effectiveRatio * (isCrit1 ? p.critMultiplier : 1));
        this.skillManager.attacks.push({ x: px, y: py, radius: range, angle: 0, life: 14, maxLife: 14, damage: dmg1, isCrit: isCrit1, isFullCircle: true, isLinear: false, hitTargets: new Set() });
        if (isCrit1) this.applyChainLightning({ x: px, y: py });
        // 2타: 대형 십자가 (10프레임 후)
        const crossRadius = CONFIG.CANVAS_HEIGHT * 0.9;
        this.pendingEvents.push({ timer: 10, fn: () => {
            this.audioManager.playCrossSlash();
            const isCrit2 = Math.random() < p.critChance;
            const dmg2 = Math.floor(p.attackDamage * effectiveRatio * (isCrit2 ? p.critMultiplier : 1));
            this.skillManager.attacks.push({ x: px, y: py, radius: crossRadius, angle: 0,          life: 14, maxLife: 14, damage: dmg2, isCrit: isCrit2, isFullCircle: false, isLinear: true, halfWidth: 50, hitTargets: new Set() });
            this.skillManager.attacks.push({ x: px, y: py, radius: crossRadius, angle: Math.PI / 2, life: 14, maxLife: 14, damage: dmg2, isCrit: isCrit2, isFullCircle: false, isLinear: true, halfWidth: 50, hitTargets: new Set() });
            if (isCrit2) this.applyChainLightning({ x: px, y: py });
        }});
        // 3타: 화면 전체 참격 (25프레임 후)
        this.pendingEvents.push({ timer: 25, fn: () => {
            const slashAngle = Math.atan2(p.dirY, p.dirX);
            const isCrit3 = Math.random() < p.critChance;
            const dmg3 = Math.floor(p.attackDamage * slashRatio * (isCrit3 ? p.critMultiplier : 1));
            this.skillManager.attacks.push({ x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2, radius: CONFIG.CANVAS_WIDTH * 1.2, angle: slashAngle, life: 20, maxLife: 20, damage: 0, isCrit: isCrit3, isFullCircle: false, isLinear: true, hitTargets: new Set() });
            this.screenShake = { duration: 30, intensity: 12 };
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.processHit(this.enemies[j], dmg3, isCrit3)) this.enemies.splice(j, 1);
            }
            if (isCrit3) this.applyChainLightning({ x: p.x, y: p.y });
        }});
    }
    triggerBulletBurst(atk, multishot) {
        const p = this.player;
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        const burstCount = atk.burstCount || 3;
        const count = 1 + (multishot || 0);
        for (let b = 0; b < burstCount; b++) {
            const delay = b * 5 + 1;
            this.pendingEvents.push({ timer: delay, fn: () => {
                let tgt = null, td = Infinity;
                this.enemies.forEach(e => { const d = Utils.dist(p.x, p.y, e.x, e.y); if (d < td) { td = d; tgt = e; } });
                if (!tgt) return;
                for (let i = 0; i < count; i++) {
                    const offset = count > 1 ? (i - (count-1)/2) * 0.15 : 0;
                    const angle = Utils.angle(p.x, p.y, tgt.x, tgt.y) + offset;
                    const isCrit = Math.random() < p.critChance;
                    const dmg = Math.floor(p.attackDamage * effectiveRatio * (isCrit ? p.critMultiplier : 1));
                    this.bullets.push(new Bullet(p.x, p.y, angle, dmg, isCrit ? '#fff' : '#ff0', atk.speed, atk.size, isCrit));
                    if (isCrit) this.applyChainLightning(tgt, true);
                }
                this.audioManager.playMissileLaunch();
            }});
        }
    }
    triggerPiercingLaser(atk) {
        const p = this.player;
        let nearest = null, nd = Infinity;
        this.enemies.forEach(e => { const d = Utils.dist(p.x, p.y, e.x, e.y); if (d < nd) { nd = d; nearest = e; } });
        const angle = nearest ? Utils.angle(p.x, p.y, nearest.x, nearest.y) : Math.atan2(p.dirY, p.dirX);
        const stacks = p.weaponArtifact?.stacks || 1;
        const effectiveRatio = atk.damageRatio + (stacks - 1) * 0.1;
        const isCrit = Math.random() < p.critChance;
        const dmg = Math.floor(p.attackDamage * effectiveRatio * (isCrit ? p.critMultiplier : 1));
        const laserRange = CONFIG.CANVAS_WIDTH * 1.5;
        const aoeRadius = atk.aoeRadius || 70;
        this.skillManager.attacks.push({ x: p.x + Math.cos(angle) * laserRange / 2, y: p.y + Math.sin(angle) * laserRange / 2, radius: laserRange, angle, life: 20, maxLife: 20, damage: dmg, isCrit, isFullCircle: false, isLinear: true, hitTargets: new Set() });
        const steps = 10;
        for (let s = 1; s <= steps; s++) {
            const dist = (laserRange / steps) * s;
            const ex = p.x + Math.cos(angle) * dist;
            const ey = p.y + Math.sin(angle) * dist;
            if (ex < -100 || ex > CONFIG.CANVAS_WIDTH + 100 || ey < -100 || ey > CONFIG.CANVAS_HEIGHT + 100) break;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (Utils.dist(ex, ey, this.enemies[j].x, this.enemies[j].y) < aoeRadius)
                    if (this.processHit(this.enemies[j], Math.floor(dmg * 0.5), isCrit, '#0ff')) this.enemies.splice(j, 1);
            }
            this.skillManager.createParticles(ex, ey, isCrit ? '#fff' : '#0ff');
        }
        this.screenShake = { duration: 20, intensity: 7 };
        this.audioManager.playMissileExplosion();
    }
    triggerEvolution(evoInfo) {
        this.state = 'EVOLVING';
        this._evoData = evoInfo;
        this._evoTimer = 0;
        // 파티클 — 파란색/금색 Shatter Particles
        for (let i = 0; i < 3; i++) {
            this.skillManager.createShatterParticles(this.player.x, this.player.y, i % 2 === 0 ? '#a78bfa' : '#fbbf24');
        }
        this.updateArtifactTray();
    }
    updateArtifactTray() {
        const tray = document.getElementById('artifact-tray');
        if (!tray || !this.player) return;
        tray.innerHTML = '';
        this.player.artifacts.forEach(art => {
            const def = ARTIFACT_POOL.find(a => a.id === art.defId);
            if (!def) return;
            const el = document.createElement('div');
            el.className = 'flex items-center gap-1 bg-surface-container/80 border border-primary/30 px-2 py-1 rounded text-xs font-headline';
            const tierColor = def.tier === 4 ? '#ffffff' : def.tier === 3 ? '#f87171' : def.tier === 2 ? '#a78bfa' : '#fbbf24';
            const bonusText = def.category === 'weapon' && art.stacks > 1
                ? ` <span style="color:#4ade80">+${(art.stacks - 1) * 10}%</span>` : '';
            const stackLabel = def.tier >= 2 ? `T${def.tier}` : `×${art.stacks}`;
            el.innerHTML = `<span style="font-size:1.2em">${def.icon}</span><span style="color:${tierColor}">${def.name}</span><span style="color:#0ff">${stackLabel}</span>${bonusText}`;
            tray.appendChild(el);
        });
    }
    // ── 인피니티 모드 돌발 이벤트 ──────────────────────────────────────────────
    triggerInfiniteAmbush() {
        this.infiniteAmbushPending = true;
        // 확률: 원거리 떼 50% / 엘리트 팩 35% / 스테이지1 보스 15%
        const r = Math.random();
        let eventType, subtitleText, toastMsg, toastIcon;
        if (r < 0.15) {
            eventType = 'boss';   subtitleText = 'STAGE-1 BOSS RETURNING'; toastMsg = 'AMBUSH: BOSS INCOMING';   toastIcon = '💀';
        } else if (r < 0.50) {
            eventType = 'elite';  subtitleText = 'ELITE SQUAD INCOMING';   toastMsg = 'AMBUSH: ELITE SQUAD';     toastIcon = '⚠️';
        } else {
            eventType = 'ranged'; subtitleText = 'RANGED SWARM INCOMING';  toastMsg = 'AMBUSH: RANGED SWARM';    toastIcon = '🎯';
        }
        this.audioManager.playWarningAlarm();
        const warningEl = document.getElementById('boss-warning');
        const subtitleEl = warningEl.querySelector('.text-xl');
        const origText = subtitleEl.textContent;
        subtitleEl.textContent = subtitleText;
        warningEl.classList.remove('hidden');
        setTimeout(() => {
            warningEl.classList.add('hidden');
            subtitleEl.textContent = origText;
            this.infiniteAmbushPending = false;
            this.showToast(toastMsg, toastIcon);
            if (eventType === 'boss') {
                const b = new Enemy(this.canvas.width / 2, 160, 'boss', this.player.level);
                b.isAmbush = true;
                this.enemies.push(b);
                this.audioManager.startBossBGM();
            } else if (eventType === 'elite') {
                for (let i = 0; i < 6; i++) {
                    const { x, y } = Utils.getSpawnPos(this.canvas.width, this.canvas.height);
                    this.enemies.push(new Enemy(x, y, 'elite', this.player.level, this));
                }
            } else {
                for (let i = 0; i < 10; i++) {
                    const { x, y } = Utils.getSpawnPos(this.canvas.width, this.canvas.height);
                    this.enemies.push(new Enemy(x, y, 'ranged', this.player.level, this));
                }
            }
        }, 3000);
    }
    // ── 글리치 위버 패턴 ────────────────────────────────────────────────────────
    triggerGemReverse(boss) {
        if (this.gems.length === 0) return;
        const positions = this.gems.map(g => ({ x: g.x, y: g.y }));
        this.gems = [];
        positions.forEach(pos => {
            const delay = 25 + Math.floor(Math.random() * 20);
            this.enemyProjectiles.push(new LaserTelegraph(pos.x, pos.y, this.player.x, this.player.y, delay, 25, 14));
        });
        for (let k = 0; k < 3; k++) this.skillManager.createParticles(boss.x, boss.y, '#0ff');
        this.showToast('GEM REVERSE', '💎');
    }
    triggerGlitchCage() {
        const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;
        [H * 0.25, H * 0.5, H * 0.75].forEach(y => {
            this.enemyProjectiles.push(new LaserTelegraph(0, y, W, y, 70, 25, 22, 2200));
        });
        [W * 0.33, W * 0.67].forEach(x => {
            this.enemyProjectiles.push(new LaserTelegraph(x, 0, x, H, 70, 25, 22, 1200));
        });
        this.showToast('GLITCH CAGE', '⛓️');
    }
    triggerGlitchMinionSpawn() {
        const count = 8 + Math.floor(Math.random() * 5); // 8~12마리
        for (let i = 0; i < count; i++) {
            const { x, y } = Utils.getSpawnPos(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            this.enemies.push(new Enemy(x, y, 'normal', this.player.level, this));
        }
    }
    triggerGlitchShift(boss) {
        for (let k = 0; k < 5; k++) this.skillManager.createParticles(boss.x, boss.y, k % 2 === 0 ? '#0ff' : '#f0f');
        const margin = 160;
        boss.x = margin + Math.random() * (CONFIG.CANVAS_WIDTH  - margin * 2);
        boss.y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - margin * 2);
        for (let k = 0; k < 5; k++) this.skillManager.createParticles(boss.x, boss.y, k % 2 === 0 ? '#f0f' : '#0ff');
    }
    triggerGameOver() { this.audioManager.stopBGM(); this.audioManager.playHit(); this.state = 'PLAYER_DYING'; this.player.deathTimer = 30; }
    checkRecoveryTrigger() {
        // 리커버리가 방금 발동됐고 아직 충격파를 생성하지 않은 경우에만 실행
        if (this.player.has.recovery && this.player.recoveryUsed && !this.recoveryShockwaveUsed) {
            this.recoveryShockwaveUsed = true;
            this.recoveryShockwave = { x: this.player.x, y: this.player.y, radius: 0 };
            // "Recovery!" 플로팅 텍스트 — 천천히 위로 떠오르며 사라지도록 큰 크기 지정
            this.skillManager.floatingTexts.push({
                x: this.player.x, y: this.player.y - 30,
                text: 'Recovery!', life: 1.0, vy: -1.2,
                isCrit: false, color: '#fff', fontSize: 28
            });
            this.updateHUD();
            this.showToast('RECOVERY ACTIVATED', '💊');
        }
    }
    handleUIKeys(e) {
        if (e.key === '-') { this.devToolsOpen = !this.devToolsOpen; this.devUI.classList.toggle('hidden', !this.devToolsOpen); if (this.devToolsOpen) this.updateDevInfo(); return; }
        if (e.key === 'Escape') { if (this.state === 'PLAYING' || this.state === 'PAUSED_MENU' || this.state === 'PAUSED') this.togglePause(); return; }
        if (this.state !== 'PAUSED') return;
        if (['1', '2', '3'].includes(e.key)) { const cards = this.ui.cards.querySelectorAll('.skill-card'); if (cards[parseInt(e.key) - 1]) cards[parseInt(e.key) - 1].click(); }
    }
    togglePause() {
        if (this.state === 'PLAYING') {
            this.prevState = null;
            this.state = 'PAUSED_MENU'; this.ui.pauseMenu.classList.remove('hidden'); this.updatePauseMenu();
        } else if (this.state === 'PAUSED') {
            // 카드 선택 중 ESC → 카드 UI 유지하고 일시정지 메뉴 표시
            this.prevState = 'PAUSED';
            this.state = 'PAUSED_MENU'; this.ui.pauseMenu.classList.remove('hidden'); this.updatePauseMenu();
        } else if (this.state === 'PAUSED_MENU') {
            this.ui.pauseMenu.classList.add('hidden');
            if (this.prevState === 'PAUSED') {
                // 카드 선택으로 복귀
                this.state = 'PAUSED'; this.prevState = null;
            } else {
                this.state = 'PLAYING'; this.player.invincible = 30;
            }
        }
    }
    updatePauseMenu() {
        const p = this.player, c = CONFIG.PLAYER;
        const diffHp = p.maxHp - c.MAX_HP;
        const diffAtk = p.attackDamage - c.ATTACK_DAMAGE;
        const diffSpd = parseFloat((p.speed - c.SPEED).toFixed(1));
        const plus = (v) => v > 0 ? ` <span style="color:#4ade80">(+${v})</span>` : '';
        document.getElementById('pause-stats').innerHTML = `<div>HP: ${p.hp}/${p.maxHp}${plus(diffHp)}</div><div>ATK: ${p.attackDamage}${plus(diffAtk)}</div><div>SPD: ${p.speed.toFixed(1)}${plus(diffSpd)}</div><div>CRIT: ${(p.critChance * 100).toFixed(0)}%</div><div>KILLS: ${p.killCount}</div>`;

        const skillsContainer = document.getElementById('pause-skills');
        skillsContainer.innerHTML = '';
        skillsContainer.className = "flex flex-col gap-6 overflow-visible w-full";

        const makeIcon = (iconHTML, name, levelText, borderColor, tooltipText) => {
            const item = document.createElement('div');
            item.className = "group relative flex items-center justify-center bg-surface-container-highest p-3 rounded-xl border hover:scale-110 transition-all duration-300 cursor-help shadow-lg";
            item.style.borderColor = borderColor;
            item.innerHTML = `
                <div class="text-3xl">${iconHTML}</div>
                <div class="absolute -top-2 -right-2 font-headline font-bold text-[10px] px-1.5 py-0.5 rounded-full" style="background:${borderColor};color:#000">${levelText}</div>
                <div class="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 min-w-[180px] w-max max-w-[220px] p-2 bg-surface-container-high border border-primary/50 rounded-lg z-[99999] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none text-xs font-body text-on-surface/80">
                    <div class="font-headline font-bold text-primary mb-1">${name}</div>${tooltipText}
                    <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-surface-container-high border-r border-b border-primary/50 rotate-45"></div>
                </div>`;
            return item;
        };

        // ── ARTIFACTS 섹션 ──────────────────────────────────
        if (p.artifacts.length > 0) {
            const artHeader = document.createElement('div');
            artHeader.className = "text-xs font-headline font-bold tracking-widest text-tertiary border-b border-tertiary/30 pb-1";
            artHeader.textContent = '⚙ ARTIFACTS';
            skillsContainer.appendChild(artHeader);
            const artRow = document.createElement('div');
            artRow.className = "flex flex-wrap gap-3";
            p.artifacts.forEach(art => {
                const def = ARTIFACT_POOL.find(a => a.id === art.defId);
                if (!def) return;
                const tierColor = def.tier === 4 ? '#ffffff' : def.tier === 3 ? '#f87171' : def.tier === 2 ? '#a78bfa' : '#fbbf24';
                let bonusText = '';
                if (art.stacks > 1) {
                    if (def.category === 'weapon') bonusText = `<br><span style="color:#4ade80">+${(art.stacks - 1) * 10}% dmg</span>`;
                    else if (def.category === 'tool') bonusText = `<br><span style="color:#4ade80">+${(art.stacks - 1) * 10}% dmg, +${(art.stacks - 1) * 2} 크기</span>`;
                }
                const levelText = def.tier >= 2 ? `T${def.tier}` : `×${art.stacks}`;
                artRow.appendChild(makeIcon(def.icon, def.name, levelText, tierColor,
                    def.desc.replace(/<[^>]+>/g, '') + bonusText));
            });
            skillsContainer.appendChild(artRow);
        }

        // ── ABILITIES 섹션 ──────────────────────────────────
        const abilityIcons = Array.from(this.ui.acquiredSkills.children);
        if (abilityIcons.length > 0) {
            const abilHeader = document.createElement('div');
            abilHeader.className = "text-xs font-headline font-bold tracking-widest text-primary border-b border-primary/30 pb-1";
            abilHeader.textContent = '⚡ ABILITIES';
            skillsContainer.appendChild(abilHeader);
            const abilRow = document.createElement('div');
            abilRow.className = "flex flex-wrap gap-3";
            abilityIcons.forEach(iconEl => {
                const count = iconEl.dataset.count || 1;
                const name = iconEl.dataset.name || '';
                const tooltipText = iconEl.dataset.tooltip ? iconEl.dataset.tooltip.replace(/<[^>]+>/g, '') : '';
                const iconHTML = iconEl.innerHTML.split('<span')[0];
                const borderColor = iconEl.style.borderColor || '#0ff';
                abilRow.appendChild(makeIcon(iconHTML, name, `LV.${count}`, borderColor, tooltipText));
            });
            skillsContainer.appendChild(abilRow);
        }

        if (p.artifacts.length === 0 && abilityIcons.length === 0) {
            skillsContainer.innerHTML = '<div class="text-on-surface/40 font-body text-center py-8">No Upgrades Acquired</div>';
        }
    }
    addAcquiredSkillUI(skill) {
        let existing = this.ui.acquiredSkills.querySelector(`.acquired-icon[data-id="${skill.id}"]`);
        if (existing) {
            let countSpan = existing.querySelector('.skill-count') || document.createElement('span');
            countSpan.className = 'skill-count'; existing.dataset.count = (parseInt(existing.dataset.count) || 1) + 1;
            countSpan.innerText = `x${existing.dataset.count}`; existing.appendChild(countSpan);
        } else {
            const el = document.createElement('div');
            const gradeColor = { bronze: '#cd7f32', silver: '#b0b8c8', gold: '#fbbf24', prism: '#a78bfa' }[skill.grade] || 'var(--neon-blue)';
            el.className = 'acquired-icon relative flex items-center justify-center'; el.dataset.id = skill.id;
            el.style.borderColor = gradeColor; el.style.boxShadow = `0 0 6px ${gradeColor}`;
            const cleanDesc = skill.desc.replace(/<[^>]+>/g, '');
            el.dataset.name = skill.name;
            el.dataset.tooltip = `${skill.name}: ${cleanDesc}`;
            el.innerHTML = skill.icon; this.ui.acquiredSkills.appendChild(el);
        }
    }
    updateDevInfo() { if (this.player) document.getElementById('dev-info').innerHTML = `Lv: ${this.player.level} | HP: ${this.player.hp}/${this.player.maxHp}<br>Enemies: ${this.enemies.length}`; }

    async renderLeaderboard() {
        const listEl = document.getElementById('leaderboard-list');
        listEl.innerHTML = '<div class="text-center text-primary animate-pulse py-8">SYNCING DATA...</div>';

        if (typeof firebaseDB !== 'undefined') {
            const data = await firebaseDB.getLeaderboard();
            if (data.length === 0) {
                listEl.innerHTML = '<div class="text-center text-on-surface/50 py-8">No Data Found.</div>';
                return;
            }
            listEl.innerHTML = data.map((entry, index) => {
                const isTop3 = index < 3;
                const rankColor = index === 0 ? 'text-[#ffba38]' : (index === 1 ? 'text-[#adcbda]' : (index === 2 ? 'text-[#ff8a65]' : 'text-on-surface/60'));
                const isMe = entry.uid === (firebaseDB.user ? firebaseDB.user.uid : '');
                return `
                    <div class="flex items-center gap-4 p-4 rounded bg-surface-container-high border ${isTop3 ? 'border-primary/40 shadow-[0_0_10px_rgba(0,218,243,0.1)]' : 'border-outline-variant/10'}">
                        <span class="w-10 text-2xl font-black ${rankColor}">#${index + 1}</span>
                        <div class="flex-1">
                            <div class="text-on-surface font-bold">${entry.displayName || 'PILOT'}</div>
                            <div class="text-[10px] text-on-surface/40 uppercase tracking-widest">${isMe ? 'YOU' : 'PILOT_ID'}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-primary font-bold">${entry.highScore} KILLS</div>
                            <div class="text-[10px] text-on-surface/40">${Math.floor(entry.surviveTime / 60)}m ${entry.surviveTime % 60}s</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            listEl.innerHTML = '<div class="text-center text-on-surface/50 py-8">Firebase not available.</div>';
        }
    }
    renderPatchNotes() {
        const listEl = document.getElementById('patch-notes-list');
        if (!listEl) return;
        listEl.innerHTML = PATCH_NOTES_DATA.map(note => `
            <div class="border-b border-outline-variant/10 pb-4 last:border-0">
                <div class="flex justify-between items-baseline mb-2">
                    <span class="text-xl font-headline font-bold text-primary">${note.version}</span>
                    <span class="text-xs text-on-surface/40 font-headline">${note.date}</span>
                </div>
                <ul class="space-y-1 text-sm text-on-surface/80">
                    ${note.items.map(item => `
                        <li class="flex gap-2">
                            <span class="font-bold text-tertiary w-20 flex-shrink-0">[${item.type}]</span>
                            <span>${item.text}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
    }

    // ── Miku 로비 캐릭터 ──────────────────────────────────────
    initMiku() {
        this.mikuEl = document.getElementById('miku-container');
        this.mikuBubble = document.getElementById('miku-bubble');
        this.mikuBubbleText = document.getElementById('miku-bubble-text');
        this.mikuCursor = document.getElementById('miku-cursor');
        this.mikuSfx = document.getElementById('miku-sfx');
        if (!this.mikuEl) return;

        this.mikuDialogues = [
            "시스템 정상 가동 중.\n언제든 출격 가능해, 파일럿!",
            "적들의 신호가 점점 강해지고 있어.\n조심해야 해.",
            "15레벨이 되면 첫 번째 보스가 나타날 거야.\n준비는 됐어?",
            "무기 업그레이드는 5스택마다\n진화한다는 사실, 잊지 마!",
            "잠깐 쉬는 것도 전략이야.\n내가 감시하고 있을게.",
            "오늘의 전술 데이터 분석 완료.\n성능 향상을 기대해도 좋아.",
            "가끔씩 시스템 어딘가에서\n대파가 등장한다는 소문이 있던데...."
        ];
        this.mikuTalking = false;
        this.mikuTypeTimer = null;
        this.mikuBubbleTimer = null;
        this.mikuRoamTimer = null;

        // 초기 위치 설정
        this._mikuPlace(20, 80);

        // 첫 로밍은 2초 후 시작
        setTimeout(() => this._mikuScheduleRoam(), 2000);

        // 클릭 이벤트
        this.mikuEl.addEventListener('click', () => this._mikuOnClick());
    }

    _mikuPlace(leftPct, bottomPx) {
        if (!this.mikuEl) return;
        this.mikuEl.style.left = leftPct + '%';
        this.mikuEl.style.bottom = bottomPx + 'px';
    }

    _mikuScheduleRoam() {
        if (this.mikuRoamTimer) clearTimeout(this.mikuRoamTimer);
        const delay = 10000 + Math.random() * 5000; // 10~15초
        this.mikuRoamTimer = setTimeout(() => {
            if (!this.mikuTalking) this._mikuRoam();
            this._mikuScheduleRoam();
        }, delay);
    }

    _mikuRoam() {
        const main = document.getElementById('lobby-main');
        if (!main || !this.mikuEl) return;
        const maxLeft = 75; // % (캐릭터 폭 고려)
        const minLeft = 5;
        const maxBottom = Math.floor(main.offsetHeight * 0.45);
        const minBottom = 55;
        const newLeft = minLeft + Math.random() * (maxLeft - minLeft);
        const newBottom = minBottom + Math.random() * (maxBottom - minBottom);
        this._mikuPlace(newLeft, newBottom);
    }

    _mikuOnClick() {
        if (!this.mikuEl) return;
        // 점프 + 발광 효과
        this.mikuEl.classList.remove('miku-jumping');
        void this.mikuEl.offsetWidth; // reflow
        this.mikuEl.classList.add('miku-jumping', 'miku-glow');
        setTimeout(() => {
            if (this.mikuEl) this.mikuEl.classList.remove('miku-jumping', 'miku-glow');
        }, 600);

        // 사운드 재생
        if (this.mikuSfx) {
            this.mikuSfx.currentTime = 0;
            this.mikuSfx.volume = 0.5;
            this.mikuSfx.play().catch(() => {});
        }

        // 말풍선 대사 출력
        this._mikuSpeak(this.mikuDialogues[Math.floor(Math.random() * this.mikuDialogues.length)]);
    }

    _mikuSpeak(text) {
        if (!this.mikuBubble || !this.mikuBubbleText) return;
        // 기존 타이머 정리
        if (this.mikuTypeTimer) clearTimeout(this.mikuTypeTimer);
        if (this.mikuBubbleTimer) clearTimeout(this.mikuBubbleTimer);
        this.mikuTalking = true;
        this.mikuBubbleText.textContent = '';
        this.mikuCursor.style.display = 'inline-block';
        this.mikuBubble.classList.add('bubble-visible');

        // 타이핑 효과
        let i = 0;
        const type = () => {
            if (i < text.length) {
                this.mikuBubbleText.textContent += text[i++];
                this.mikuTypeTimer = setTimeout(type, 38);
            } else {
                // 타이핑 완료 → 5초 후 페이드아웃
                this.mikuCursor.style.display = 'none';
                this.mikuBubbleTimer = setTimeout(() => {
                    this.mikuBubble.classList.remove('bubble-visible');
                    setTimeout(() => {
                        if (this.mikuBubbleText) this.mikuBubbleText.textContent = '';
                        this.mikuTalking = false;
                    }, 320);
                }, 5000);
            }
        };
        type();
    }
}
window.onload = () => { new Game(); };

