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
    triggerAttack(player) {
        let radius = player.attackRange / 1.5;
        let damage = player.attackDamage;
        let isFullCircle = false;
        let isLinear = false;

        if (player.job === 'overload') {
            isFullCircle = true;
        } else if (player.job === 'swordman' || player.job === 'swordmaster') {
            player.combo = (player.combo % 3) + 1;
            player.comboTimer = 60;

            if (player.combo === 2) {
                radius *= 2.0;
                damage *= 1.4;
                isLinear = true;
            } else if (player.combo === 3) {
                if (player.job === 'swordmaster') {
                    // 소드마스터: 차징 진입 — 실제 폭발은 chargeReady 시 발동
                    player.charging = true;
                    player.chargeTimer = 25;
                    return;
                }
                radius *= 2.5;
                damage *= 2.2;
                isFullCircle = true;
            } else {
                damage *= 1.1;
            }
        }

        const cx = player.x + (isFullCircle ? 0 : player.dirX * (player.attackRange / 2));
        const cy = player.y + (isFullCircle ? 0 : player.dirY * (player.attackRange / 2));
        // 서지 캐소드: 활성화 중이면 무조건 크리, 그 후 타이머 소모
        const isCrit = player.surgeCritActive || Math.random() < player.critChance;
        let finalDamage = damage;
        if (isCrit) {
            finalDamage = damage * player.critMultiplier;
            // 서지 캐소드 중첩 보너스 (스택당 +10)
            finalDamage += player.surgeCathodeStacks * 10;
            if (player.surgeCritActive) { player.surgeCritActive = false; player.surgeCritTimer = 0; }
        }

        this.attacks.push({
            x: cx, y: cy,
            radius: radius,
            angle: Math.atan2(player.dirY, player.dirX),
            life: 12, maxLife: 12,
            damage: finalDamage,
            isCrit,
            isFullCircle,
            isLinear,
            combo: player.combo,
            hitTargets: new Set()
        });
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
                ctx.rect(0, -20, atk.radius, 40);
                ctx.restore();
            } else if (atk.isFullCircle) {
                ctx.arc(atk.x, atk.y, atk.radius, 0, Math.PI * 2);
            } else {
                ctx.arc(atk.x, atk.y, atk.radius, atk.angle - Math.PI / 1.5, atk.angle + Math.PI / 1.5);
            }

            let strokeColor = `rgba(0, 255, 255, ${atk.life / atk.maxLife})`;
            if (atk.combo === 3) strokeColor = `rgba(255, 0, 255, ${atk.life / atk.maxLife})`;
            else if (atk.combo === 2) strokeColor = `rgba(255, 255, 255, ${atk.life / atk.maxLife})`;

            ctx.lineWidth = 15 * (atk.life / atk.maxLife);
            ctx.strokeStyle = strokeColor;
            ctx.shadowBlur = 20;
            ctx.shadowColor = atk.combo === 3 ? '#f0f' : (atk.combo === 2 ? '#fff' : '#0ff');
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
                this.ui.mainOverlay.classList.add('hidden');
                this.ui.gameUILayer.classList.remove('hidden');
                this.canvas.classList.remove('hidden');
                this.audioManager.init(); // 오디오 컨텍스트 초기화 (자동 재생 우회)
                this.init();
                if (!this.loopStarted) {
                    this.loopStarted = true;
                    this.lastFrameTime = performance.now();
                    requestAnimationFrame((t) => this.loop(t)); // 게임 메인 루프 실행 시작
                }
            };
        }

        this.ui.resumeBtn.onclick = () => { this.ui.resumeBtn.blur(); if (this.state === 'PAUSED_MENU') this.togglePause(); };
        this.ui.restartBtn.onclick = () => {
            this.ui.restartBtn.blur();
            if (this.state === 'PAUSED_MENU') {
                this.togglePause();
                this.state = 'TITLE';
                this.audioManager.stopBGM();
                this.ui.pauseMenu.classList.add('hidden');
                this.ui.gameUILayer.classList.add('hidden');
                this.canvas.classList.add('hidden');
                this.ui.mainOverlay.classList.remove('hidden');
                const title = this.ui.mainOverlay.querySelector('h1');
                const desc = this.ui.mainOverlay.querySelector('p');
                if (title) title.innerText = "CYBER SURVIVOR";
                if (desc) desc.innerHTML = "이동: 방향키 (Arrow Keys)<br>공격: Z 키 (전방 범위 공격)<br>회피: Spacebar (무적 대시)";
                this.ui.startBtn.innerText = "MISSION_START";
            }
        };
        window.addEventListener('keydown', (e) => this.handleUIKeys(e));
        this.devToolsOpen = false;
        this.devUI = document.getElementById('dev-tools');
        document.getElementById('dev-lvup').onclick = () => { if (this.player) { this.player.level++; this.player.exp = 0; this.showLevelUpMenu(); this.updateDevInfo(); } };
        document.getElementById('dev-lvup5').onclick = () => { if (this.player) { for (let i = 0; i < 5; i++) { this.player.level++; } this.player.exp = 0; this.showLevelUpMenu(); this.updateDevInfo(); } };
        document.getElementById('dev-hp').onclick = () => { if (this.player) { this.player.hp = this.player.maxHp; this.updateHUD(); this.updateDevInfo(); } };
        document.getElementById('dev-kill-all').onclick = () => { this.enemies.forEach(e => { this.skillManager.createParticles(e.x, e.y, e.color); this.score++; }); this.enemies = []; this.updateHUD(); this.updateDevInfo(); };

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
    init() {
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.enemies = []; this.gems = []; this.items = []; this.enemyProjectiles = []; this.score = 0; this.frameCount = 0; this.gameTime = 0;
        this.bossSpawned = false; this.bossDefeated = false; this.bossWarning = false;
        this.boss2Warning = false; this.boss2Spawned = false; this.boss2Defeated = false;
        this.infiniteModeActive = false;
        this.shockwave = null; this.recoveryShockwave = null; this.recoveryShockwaveUsed = false;
        this.bullets = []; this.droneMissiles = []; this.missileQueue = []; this.advancementShown = false; this.advancementPending = false;
        this.infiniteAmbushTimer = 0; this.infiniteAmbushPending = false;
        this.updateHUD();
        this.ui.levelup.classList.add('hidden');
        this.state = 'PLAYING';
        this.ui.acquiredSkills.innerHTML = '';
        this.audioManager.startBGM();
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
            const spawnCount = Math.floor(Math.random() * 3) + 4; // 4~6마리
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
    showLevelUpMenu() {
        if (this.advancementPending) return; // 2차 전직 대기 중이면 일반 카드 창 열지 않음
        this.state = 'PAUSED'; this.ui.levelup.classList.remove('hidden'); this.ui.cards.innerHTML = '';
        this.audioManager.playLevelUp();

        // 1차 직업 선택 (Lv.5)
        if (this.player.level === 5 && !this.player.job) {
            JOB_POOL.filter(j => j.tier === 1).forEach((skill, index) => {
                const card = document.createElement('div'); card.className = 'skill-card grade-gold';
                card.innerHTML = `<div class="grade-badge gold">JOB</div><div class="skill-icon">${skill.icon}</div><div class="skill-info"><div class="skill-title">${skill.name} <span style="font-size:0.8em; color:#0ff; margin-left:10px;">[${index + 1}키]</span></div><div class="skill-desc">${skill.desc}</div></div>`;
                card.onclick = () => { this.player.applyUpgrade(skill.id); this.addAcquiredSkillUI(skill); this.ui.levelup.classList.add('hidden'); this.ui.cards.innerHTML = ''; this.updateHUD(); this.state = 'PLAYING'; };
                this.ui.cards.appendChild(card);
            });
            return;
        }

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

        // Prism 이미 획득한 스킬은 풀에서 제거
        const availablePool = SKILL_POOL.filter(s => !(s.unique && this.player.has[s.id]));

        const picks = [];
        for (let i = 0; i < 3; i++) {
            let grade = rollGrade();
            // 해당 등급 후보
            let candidates = availablePool.filter(s => s.grade === grade && !picks.includes(s));
            // 후보 없으면 등급 다운
            if (candidates.length === 0) { grade = grade === 'prism' ? 'gold' : grade === 'gold' ? 'silver' : 'bronze'; candidates = availablePool.filter(s => s.grade === grade && !picks.includes(s)); }
            if (candidates.length === 0) candidates = availablePool.filter(s => !picks.includes(s));
            if (candidates.length === 0) break;
            picks.push(candidates[Math.floor(Math.random() * candidates.length)]);
        }

        picks.forEach((skill, index) => {
            const gradeLabel = { bronze: '🥉 BRONZE', silver: '🥈 SILVER', gold: '🥇 GOLD', prism: '💎 PRISM' }[skill.grade] || '';
            const card = document.createElement('div'); card.className = `skill-card grade-${skill.grade}`;
            card.innerHTML = `<div class="grade-badge ${skill.grade}">${gradeLabel}</div><div class="skill-icon">${skill.icon}</div><div class="skill-info"><div class="skill-title">${skill.name} <span style="font-size:0.8em; color:#0ff; margin-left:10px;">[${index + 1}키]</span></div><div class="skill-desc">${skill.desc}</div></div>`;
            card.onclick = () => { this.player.applyUpgrade(skill.id); this.addAcquiredSkillUI(skill); this.ui.levelup.classList.add('hidden'); this.ui.cards.innerHTML = ''; this.updateHUD(); this.state = 'PLAYING'; };
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
        if (this.state === 'PLAYER_DYING') {
            this.gems.forEach(g => g.draw(this.ctx)); this.enemies.forEach(e => e.draw(this.ctx, this.player.x, this.player.y)); this.enemyProjectiles.forEach(p => p.draw(this.ctx));
            if (--this.player.deathTimer <= 0) {
                this.state = 'GAMEOVER'; this.skillManager.createShatterParticles(this.player.x, this.player.y, this.player.neonColor); this.audioManager.playHit();
                setTimeout(() => {
                    this.ui.mainOverlay.classList.remove('hidden'); this.ui.gameUILayer.classList.add('hidden'); this.canvas.classList.add('hidden');
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
        // 인피니티 모드 돌발 이벤트 — 3분(10800프레임)마다 위협 발생
        if (this.infiniteModeActive && !this.infiniteAmbushPending) {
            this.infiniteAmbushTimer++;
            if (this.infiniteAmbushTimer >= 10800) { this.infiniteAmbushTimer = 0; this.triggerInfiniteAmbush(); }
        }
        this.player.update(this.input);

        // 소드마스터 차징 완료 — 광범위 폭발 발동
        if (this.player.chargeReady) {
            this.player.chargeReady = false;
            this.player.combo = 0;
            const p = this.player;
            const isCrit = Math.random() < p.critChance;
            const chargeDmg = p.attackDamage * 7.0;
            const finalChargeDmg = isCrit ? chargeDmg * p.critMultiplier : chargeDmg;
            this.skillManager.attacks.push({
                x: p.x, y: p.y, radius: p.attackRange * 2, angle: 0,
                life: 20, maxLife: 20, damage: finalChargeDmg, isCrit, isFullCircle: true, isLinear: false,
                combo: 3, hitTargets: new Set()
            });
            for (let k = 0; k < 3; k++) this.skillManager.createParticles(p.x, p.y, k % 2 === 0 ? '#f0f' : '#fff');
            this.audioManager.playChargeRelease();
        }

        // Z키: 거너/데스페라도는 자동조준 사용 (Z키 근접 공격 제외)
        if (this.input.keys.z && this.player.cooldown <= 0) {
            const isGunner = this.player.job === 'gunner' || this.player.job === 'desperado';
            if (!isGunner) {
                this.skillManager.triggerAttack(this.player);
                // 소드마스터 차징 진입 시 빌드업 사운드, 그 외 일반 슬래쉬
                if (this.player.charging && this.player.chargeTimer === 25) {
                    this.audioManager.playChargeStart();
                } else {
                    this.audioManager.playSwordSlash();
                }
                this.player.cooldown = this.player.maxCooldown;
            }
        }

        // 거너 / 데스페라도: Z키 홀드 시 자동 조준 사격
        if ((this.player.job === 'gunner' || this.player.job === 'desperado') && this.input.keys.z && this.player.cooldown <= 0) {
            let nearest = null, nearestDist = Infinity;
            this.enemies.forEach(e => { const d = Utils.dist(this.player.x, this.player.y, e.x, e.y); if (d < nearestDist) { nearestDist = d; nearest = e; } });
            if (nearest) {
                const angle = Utils.angle(this.player.x, this.player.y, nearest.x, nearest.y);
                const isDesp = this.player.job === 'desperado';
                // 크리티컬 계산 (근접공격과 동일 메커니즘)
                const isCrit = this.player.surgeCritActive || Math.random() < this.player.critChance;
                let bDmg = isDesp ? this.player.attackDamage * 1.8 : this.player.attackDamage;
                if (isCrit) {
                    bDmg = bDmg * this.player.critMultiplier + this.player.surgeCathodeStacks * 10;
                    if (this.player.surgeCritActive) { this.player.surgeCritActive = false; this.player.surgeCritTimer = 0; }
                }
                const bSize = isDesp ? 10 : 5; const bSpeed = isDesp ? 20 : 15;
                const bColor = isCrit ? '#fff' : (isDesp ? '#ff6600' : '#ff0');
                this.bullets.push(new Bullet(this.player.x, this.player.y, angle, bDmg, bColor, bSpeed, bSize, isCrit));
                this.player.cooldown = this.player.maxCooldown;
                this.audioManager.playSwordSlash();
            }
        }
        const baseInterval = Math.max(25, 60 - (this.player.level * 2));
        const infiniteInterval = 20 + Math.max(0, (this.player.level - 30) * 2);
        const spawnInterval = this.infiniteModeActive ? infiniteInterval
                            : this.bossDefeated ? Math.max(12, Math.floor(baseInterval / 2))
                            : baseInterval;
        if (this.frameCount % spawnInterval === 0) this.spawnEnemy();
        this.enemyProjectiles.forEach((p, i) => { p.update(this.player, this); p.draw(this.ctx); if (p.state === 'DONE') this.enemyProjectiles.splice(i, 1); });

        // 메카닉/사이버: 드론 유도 미사일 (cooldown 기반, maxCooldown 비율 스케일)
        if (this.player.job === 'mecha' || this.player.job === 'cyber') {
            this.player.drones.forEach(d => {
                if (!d.readyToFire) return;
                let closest = null, closestDist = 350;
                this.enemies.forEach(e => {
                    const dd = Utils.dist(d.x, d.y, e.x, e.y);
                    if (dd < closestDist) { closestDist = dd; closest = e; }
                });
                if (closest) {
                    this.missileQueue.push({ framesLeft: 0, drone: d, target: closest, ratio: 0.5 });
                }
                d.resetCooldown(150, this.player);
            });
        }

        // 오버로드: 융단 포격 - 45프레임마다 무작위 적 3~5명 동시 록온, 데미지 70~80%
        if (this.player.job === 'overload') {
            this.player.drones.forEach(d => {
                if (!d.readyToFire) return;
                const count = Math.floor(Math.random() * 3) + 3; // 3~5발
                const nearby = this.enemies.filter(e => Utils.dist(d.x, d.y, e.x, e.y) < 600)
                    .sort(() => Math.random() - 0.5); // 무작위 순서
                for (let k = 0; k < count; k++) {
                    const tgt = k < nearby.length
                        ? nearby[k]
                        : { x: Math.random() * CONFIG.CANVAS_WIDTH, y: Math.random() * CONFIG.CANVAS_HEIGHT };
                    const ratio = 0.7 + Math.random() * 0.1; // 70~80%
                    this.missileQueue.push({ framesLeft: k * 3, drone: d, target: tgt, ratio });
                }
                d.resetCooldown(45, this.player);
            });
        }

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
                            if (rx > 0 && rx < atk.radius && Math.abs(ry) < 40 + e.radius) isHit = true;
                        } else {
                            let diff = Math.abs(atk.angle - a); if (diff > Math.PI) diff = Math.PI * 2 - diff;
                            if (diff < Math.PI / 1.5) isHit = true;
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
                    // 데스페라도: 적중 지점에 원형 폭발 AOE (processHit 전에 좌표 캡처)
                    if (this.player.job === 'desperado') {
                        this.skillManager.attacks.push({
                            x: e.x, y: e.y, radius: this.player.attackRange,
                            angle: 0, life: 12, maxLife: 12, damage: b.damage * 0.6,
                            isCrit: b.isCrit, isFullCircle: true, isLinear: false,
                            combo: 0, hitTargets: new Set([e])
                        });
                        this.skillManager.createParticles(e.x, e.y, '#ff6600');
                    }
                    if (this.processHit(e, b.damage, b.isCrit, b.color)) this.enemies.splice(j, 1);
                    if (!b.piercing) { b.isAlive = false; break; }
                }
            }
        }

        // 소드마스터 차징 VFX (외부에서 수렴하는 원 — 에너지가 안쪽으로 모임)
        if (this.player.charging) {
            const progress = 1 - this.player.chargeTimer / 25; // 0 → 1
            this.ctx.save();
            // 반지름: 100 → 20 (수축), 선 두께·밝기: 진입할수록 강해짐
            this.ctx.beginPath(); this.ctx.arc(this.player.x, this.player.y, 100 - progress * 80, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255,0,255,${0.3 + progress * 0.65})`;
            this.ctx.lineWidth = 3 + progress * 7; this.ctx.shadowBlur = 30; this.ctx.shadowColor = '#f0f';
            this.ctx.stroke(); this.ctx.restore();
        }

        this.player.draw(this.ctx, this.frameCount); this.skillManager.updateAndDraw(this.ctx);
    }
    explodeMissile(m) {
        // 폭발 파티클
        for (let k = 0; k < 5; k++) this.skillManager.createParticles(m.x, m.y, k % 2 === 0 ? '#f7d774' : '#f80');
        if (!this.playedExplosionThisFrame) { this.audioManager.playMissileExplosion(); this.playedExplosionThisFrame = true; }
        // 크리티컬 판정 (폭발 시점의 실시간 공격력 적용)
        const isCrit = this.player.surgeCritActive || Math.random() < this.player.critChance;
        let dmg = this.player.attackDamage * m.damageRatio;
        if (isCrit) {
            dmg = dmg * this.player.critMultiplier + (this.player.surgeCathodeStacks || 0) * 10;
            if (this.player.surgeCritActive) { this.player.surgeCritActive = false; this.player.surgeCritTimer = 0; }
        }
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
                this.advancementPending = true;
                setTimeout(() => { this.advancementPending = false; this.showAdvancementMenu(); }, 1500);
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
    showAdvancementMenu() {
        if (this.advancementShown) return;
        const jobMap = { 'swordman': 'install_sword', 'gunner': 'install_gunner', 'mecha': 'install_mecha' };
        const req = jobMap[this.player.job];
        if (!req) return; // 직업 없거나 이미 2차 전직 상태
        const advancement = JOB_POOL.filter(j => j.tier === 2 && j.requires === req);
        if (advancement.length === 0) return;
        this.advancementShown = true;
        this.audioManager.playLevelUp();
        this.state = 'PAUSED';
        this.ui.levelup.classList.remove('hidden');
        this.ui.levelup.classList.add('advancement-active');
        this.ui.levelup.querySelector('h2').textContent = 'JOB ADVANCEMENT';
        this.ui.cards.innerHTML = '';
        advancement.forEach((skill, index) => {
            const card = document.createElement('div'); card.className = 'skill-card grade-prism';
            card.innerHTML = `<div class="grade-badge prism">2차 전직</div><div class="skill-icon">${skill.icon}</div><div class="skill-info"><div class="skill-title">${skill.name} <span style="font-size:0.8em; color:#0ff; margin-left:10px;">[${index + 1}키]</span></div><div class="skill-desc">${skill.desc}</div></div>`;
            card.onclick = () => {
                this.player.applyUpgrade(skill.id); this.addAcquiredSkillUI(skill);
                this.ui.levelup.classList.remove('advancement-active');
                this.ui.levelup.querySelector('h2').textContent = 'SYSTEM UPGRADE';
                this.ui.levelup.classList.add('hidden'); this.ui.cards.innerHTML = ''; this.updateHUD(); this.state = 'PLAYING';
            };
            this.ui.cards.appendChild(card);
        });
        this.showToast('2차 전직 가능!', '⚡');
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
        const diffRange = Math.round(p.attackRange - c.ATTACK_RANGE);
        const diffSpd = parseFloat((p.speed - c.SPEED).toFixed(1));
        const plus = (v) => v > 0 ? ` <span style="color:#4ade80">(+${v})</span>` : '';
        document.getElementById('pause-stats').innerHTML = `<div>HP: ${p.hp}/${p.maxHp}${plus(diffHp)}</div><div>ATK: ${p.attackDamage}${plus(diffAtk)}</div><div>RANGE: ${p.attackRange.toFixed(0)}${plus(diffRange)}</div><div>SPD: ${p.speed.toFixed(1)}${plus(diffSpd)}</div><div>CRIT: ${(p.critChance * 100).toFixed(0)}%${p.critChance > 0 ? plus((p.critChance * 100).toFixed(0)) : ''}</div>`;
        // Pause 메뉴 스킬 리스트 심플하게 재구성
        const skillsContainer = document.getElementById('pause-skills');
        skillsContainer.innerHTML = '';
        // 스크롤바 없이 획득 순서대로 나란히 배치 (Flex Wrap)
        skillsContainer.className = "flex flex-wrap gap-4 overflow-visible w-full";

        Array.from(this.ui.acquiredSkills.children).forEach(iconEl => {
            const count = iconEl.dataset.count || 1;
            const name = iconEl.dataset.name || 'Unknown Ability';
            const tooltipText = iconEl.dataset.tooltip ? iconEl.dataset.tooltip.replace(/<[^>]+>/g, '') : '';
            const iconHTML = iconEl.innerHTML.split('<span')[0];

            const item = document.createElement('div');
            // 호버 시 스케일 업 및 커스텀 박스 툴팁 제공
            item.className = "group relative flex items-center justify-center bg-surface-container-highest p-4 rounded-xl border border-outline-variant/30 hover:bg-primary hover:scale-110 transition-all duration-300 cursor-help shadow-lg";

            item.innerHTML = `
                <div class="text-4xl group-hover:text-surface transition-colors">${iconHTML}</div>
                <div class="absolute -top-2 -right-2 bg-tertiary text-on-tertiary font-headline font-bold text-[10px] px-2 py-1 rounded-full shadow-md group-hover:bg-white group-hover:text-primary transition-colors">
                    LV.${count}
                </div>
                <!-- 커스텀 박스 툴팁 UI (아이콘 위쪽 배치 - 표시 속성 안정화) -->
                <div class="absolute bottom-[calc(100%+15px)] left-1/2 -translate-x-1/2 min-w-[200px] w-max max-w-[250px] p-3 bg-surface-container-high border border-primary/50 rounded-lg shadow-[0_5px_20px_rgba(0,0,0,0.8)] z-[999] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                    <div class="flex items-center gap-2 mb-2 border-b border-outline-variant/30 pb-2">
                        <span class="text-2xl">${iconHTML}</span>
                        <div class="text-primary font-headline font-bold text-sm tracking-widest uppercase">${name}</div>
                    </div>
                    <div class="text-on-surface/80 font-body text-[12px] leading-relaxed break-normal whitespace-normal">
                        ${tooltipText || 'No description available.'}
                    </div>
                    <!-- 하단 중앙 화살표 -->
                    <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-container-high border-r border-b border-primary/50 rotate-45"></div>
                </div>
            `;

            item.classList.add('acquired-icon');
            skillsContainer.appendChild(item);
        });

        if (skillsContainer.children.length === 0) {
            skillsContainer.innerHTML = '<div class="w-full text-on-surface/40 font-body text-center py-10">No Abilities Acquired</div>';
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
}
window.onload = () => { new Game(); };
