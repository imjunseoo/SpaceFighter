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

        if (player.job === 'swordmaster') {
            player.combo = (player.combo % 3) + 1;
            player.comboTimer = 60; 
            
            if (player.combo === 2) {
                radius *= 2.0;
                damage *= 1.4; // 1.5 -> 1.4 하향
                isLinear = true;
            } else if (player.combo === 3) {
                radius *= 2.5; 
                damage *= 2.2; // 2.5 -> 2.2 하향
                isFullCircle = true;
            } else {
                damage *= 1.1; // 1.2 -> 1.1 하향
            }
        }

        const cx = player.x + (isFullCircle ? 0 : player.dirX * (player.attackRange / 2));
        const cy = player.y + (isFullCircle ? 0 : player.dirY * (player.attackRange / 2));
        const isCrit = Math.random() < player.critChance;
        
        this.attacks.push({ 
            x: cx, y: cy, 
            radius: radius, 
            angle: Math.atan2(player.dirY, player.dirX), 
            life: 12, maxLife: 12, 
            damage: isCrit ? damage * 2 : damage, 
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
            ctx.globalAlpha = t.life; ctx.fillStyle = t.isCrit ? '#ff0' : t.color; ctx.font = `bold ${t.isCrit ? 22 : 16}px Consolas`;
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
                this.init(); 
            };
        }

        this.ui.resumeBtn.onclick = () => { this.ui.resumeBtn.blur(); if(this.state === 'PAUSED_MENU') this.togglePause(); };
        this.ui.restartBtn.onclick = () => { 
            this.ui.restartBtn.blur(); 
            if(this.state === 'PAUSED_MENU') { 
                this.togglePause(); 
                this.state = 'TITLE';
                this.audioManager.stopBGM();
                this.ui.pauseMenu.classList.add('hidden'); 
                this.ui.gameUILayer.classList.add('hidden');
                this.canvas.classList.add('hidden');
                this.ui.mainOverlay.classList.remove('hidden');
                const title = this.ui.mainOverlay.querySelector('h1');
                const desc = this.ui.mainOverlay.querySelector('p');
                if(title) title.innerText = "CYBER SURVIVOR";
                if(desc) desc.innerHTML = "이동: 방향키 (Arrow Keys)<br>공격: Z 키 (전방 범위 공격)<br>회피: Spacebar (무적 대시)";
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
                    } catch(err) {
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

        requestAnimationFrame((t) => this.loop(t));
    }
    init() {
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.enemies = []; this.gems = []; this.items = []; this.enemyProjectiles = []; this.score = 0; this.frameCount = 0; this.gameTime = 0;
        this.bossSpawned = false; this.bossDefeated = false; this.bossWarning = false;
        this.shockwave = null;
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
        this.enemies.push(new Enemy(x, y, type, lv));
    }
    showLevelUpMenu() {
        this.state = 'PAUSED'; this.ui.levelup.classList.remove('hidden'); this.ui.cards.innerHTML = '';
        this.audioManager.playLevelUp();
        let pool = [...SKILL_POOL];
        let pickCount = 3;
        if (this.player.level === 5 && !this.player.job) { pool = [...JOB_POOL]; pickCount = 2; }
        pool.sort(() => 0.5 - Math.random()).slice(0, pickCount).forEach((skill, index) => {
            const card = document.createElement('div'); card.className = 'skill-card';
            card.innerHTML = `${skill.mostPick ? '<div class="most-pick">👍 Most Pick!</div>' : ''}<div class="skill-icon">${skill.icon}</div><div class="skill-info"><div class="skill-title">${skill.name} <span style="font-size:0.8em; color:#0ff; margin-left:10px;">[${index + 1}키]</span></div><div class="skill-desc">${skill.desc}</div></div>`;
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
        if(!container) return;
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
        this.ctx.fillStyle = '#050510'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#112'; this.ctx.lineWidth = 1; this.ctx.beginPath();
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
                    if(title) title.innerText = "SYSTEM FAILED"; if(desc) desc.innerHTML = `LV: ${this.player.level} / 생존 시간: ${this.ui.timer.innerText} / 킬수: ${this.score}`;
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
        this.player.update(this.input); if (this.input.keys.z && this.player.cooldown <= 0) { this.skillManager.triggerAttack(this.player); this.audioManager.playSwordSlash(); this.player.cooldown = this.player.maxCooldown; }
        if (this.frameCount % Math.max(12, 45 - (this.player.level * 2)) === 0) this.spawnEnemy();
        this.enemyProjectiles.forEach((p, i) => { p.update(this.player, this); p.draw(this.ctx); if (p.state === 'DONE') this.enemyProjectiles.splice(i, 1); });
        
        // 드론 레이저 타겟팅 (접촉 대신 가장 가까운 적에게 레이저)
        if (this.player.job === 'cyber' && this.frameCount % 15 === 0) {
            const droneDmg = Math.floor(this.player.attackDamage * 0.3);
            this.player.drones.forEach(d => {
                let closest = null, closestDist = 300;
                this.enemies.forEach(e => {
                    const dd = Utils.dist(d.x, d.y, e.x, e.y);
                    if (dd < closestDist) { closestDist = dd; closest = e; }
                });
                if (closest) {
                    d.target = closest;
                    closest.hp -= droneDmg;
                    this.skillManager.createFloatingText(closest.x, closest.y - 10, Math.round(droneDmg), false, '#0ff');
                } else { d.target = null; }
            });
        }
        // 드론 레이저 라인 렌더링
        if (this.player.job === 'cyber') {
            this.ctx.save();
            this.player.drones.forEach(d => {
                if (d.target && d.target.hp > 0) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(d.x, d.y);
                    this.ctx.lineTo(d.target.x, d.target.y);
                    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            });
            this.ctx.restore();
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
                            atk.hitTargets.add(e); if (!this.playedHitThisFrame) { this.audioManager.playHit(); this.playedHitThisFrame = true; }
                            e.hp -= atk.damage; this.skillManager.createFloatingText(e.x, e.y - 15, Math.round(atk.damage), atk.isCrit);
                            e.knockbackX = Math.cos(a) * (atk.isFullCircle ? 25 : 15); e.knockbackY = Math.sin(a) * (atk.isFullCircle ? 25 : 15);
                            if (e.hp <= 0) {
                                this.skillManager.createParticles(e.x, e.y, e.color);
                                if (e.type === 'elite') this.items.push(new Magnet(e.x, e.y));
                                let gv = (e.type === 'ranged') ? 3 : (e.type === 'bomber' ? 5 : (e.type === 'elite' ? 10 : 1));
                                if (e.type === 'elite') for (let k = 0; k < 5; k++) this.gems.push(new Gem(e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, gv));
                                else if (e.type === 'boss') {
                                    for (let k = 0; k < 30; k++) this.gems.push(new Gem(e.x + Math.random() * 80 - 40, e.y + Math.random() * 80 - 40, 5));
                                    this.bossDefeated = true;
                                    // 거대 폭발 파티클 (여러 색상 섞기)
                                    for(let p=0; p<150; p++) {
                                        this.skillManager.createParticles(e.x, e.y, Math.random() > 0.5 ? '#fbc531' : (Math.random() > 0.5 ? '#f00' : '#fa0'));
                                    }
                                    if(this.audioManager.startBGM) this.audioManager.startBGM();
                                    
                                    // 업적: BOSS_SLAYER
                                    if (typeof firebaseDB !== 'undefined') {
                                        firebaseDB.updateAchievement('BOSS_SLAYER');
                                        this.showToast('ACHIEVEMENT UNLOCKED: BOSS SLAYER', '🏆');
                                    }
                                }
                                else this.gems.push(new Gem(e.x, e.y, gv));
                                this.enemies.splice(j, 1); this.score++;
                                if (this.player.vampireChance > 0 && Math.random() < this.player.vampireChance && this.player.hp < this.player.maxHp) {
                                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5); this.skillManager.createFloatingText(this.player.x, this.player.y - 20, '+5', false, '#4ade80');
                                }
                                this.updateHUD();
                            } else this.skillManager.createParticles(e.x, e.y, '#fff');
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
            e.update(this.player, this); if (e.hp <= 0) { this.enemies.splice(i, 1); return; }
            e.draw(this.ctx, this.player.x, this.player.y);
            if (Utils.dist(this.player.x, this.player.y, e.x, e.y) < this.player.radius + e.radius && !this.player.isDashing && this.player.invincible <= 0) {
                if (this.player.takeDamage(10)) this.triggerGameOver(); this.updateHUD();
            }
        });
        this.player.draw(this.ctx, this.frameCount); this.skillManager.updateAndDraw(this.ctx);
    }
    triggerGameOver() { this.audioManager.stopBGM(); this.audioManager.playHit(); this.state = 'PLAYER_DYING'; this.player.deathTimer = 30; }
    handleUIKeys(e) {
        if (e.key === 'Enter') { this.devToolsOpen = !this.devToolsOpen; this.devUI.classList.toggle('hidden', !this.devToolsOpen); if (this.devToolsOpen) this.updateDevInfo(); return; }
        if (e.key === 'Escape') { if (this.state === 'PLAYING' || this.state === 'PAUSED_MENU') this.togglePause(); return; }
        if (this.state !== 'PAUSED') return;
        if (['1', '2', '3'].includes(e.key)) { const cards = this.ui.cards.querySelectorAll('.skill-card'); if (cards[parseInt(e.key) - 1]) cards[parseInt(e.key) - 1].click(); }
    }
    togglePause() {
        if (this.state === 'PLAYING') { this.state = 'PAUSED_MENU'; this.ui.pauseMenu.classList.remove('hidden'); this.updatePauseMenu(); }
        else if (this.state === 'PAUSED_MENU') { this.state = 'PLAYING'; this.ui.pauseMenu.classList.add('hidden'); this.player.invincible = 30; }
    }
    updatePauseMenu() {
        const p = this.player, c = CONFIG.PLAYER;
        const diffHp = p.maxHp - c.MAX_HP;
        const diffAtk = p.attackDamage - c.ATTACK_DAMAGE;
        const diffRange = Math.round(p.attackRange - c.ATTACK_RANGE);
        const diffSpd = parseFloat((p.speed - c.SPEED).toFixed(1));
        const plus = (v) => v > 0 ? ` <span style="color:#4ade80">(+${v})</span>` : '';
        document.getElementById('pause-stats').innerHTML = `<div>HP: ${p.hp}/${p.maxHp}${plus(diffHp)}</div><div>ATK: ${p.attackDamage}${plus(diffAtk)}</div><div>RANGE: ${p.attackRange.toFixed(0)}${plus(diffRange)}</div><div>SPD: ${p.speed.toFixed(1)}${plus(diffSpd)}</div><div>CRIT: ${(p.critChance*100).toFixed(0)}%${p.critChance > 0 ? plus((p.critChance*100).toFixed(0)) : ''}</div>`;
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
            const el = document.createElement('div'); el.className = 'acquired-icon relative flex items-center justify-center'; el.dataset.id = skill.id;
            const cleanDesc = skill.desc.replace(/<[^>]+>/g, '');
            el.dataset.name = skill.name;
            el.dataset.tooltip = `${skill.name}: ${cleanDesc}`;
            el.innerHTML = skill.icon; this.ui.acquiredSkills.appendChild(el);
        }
    }
    updateDevInfo() { if (this.player) document.getElementById('dev-info').innerHTML = `Lv: ${this.player.level} | HP: ${this.player.hp}/${this.player.maxHp}<br>Enemies: ${this.enemies.length}`; }
}
window.onload = () => { new Game(); };
