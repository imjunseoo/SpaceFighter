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
                damage *= 1.5;
                isLinear = true;
            } else if (player.combo === 3) {
                radius *= 2.5; // 유저 요청: 더 넓은 360도
                damage *= 2.5;
                isFullCircle = true;
            } else {
                damage *= 1.2;
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
        this.state = 'TITLE'; 
        this.lastFrameTime = performance.now();
        this.fpsCap = 1000 / 60;
        requestAnimationFrame((t) => this.loop(t));
    }
    init() {
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.enemies = []; this.gems = []; this.enemyProjectiles = []; this.score = 0; this.frameCount = 0; this.gameTime = 0;
        this.bossSpawned = false; this.bossDefeated = false;
        this.updateHUD(); 
        this.ui.levelup.classList.add('hidden'); 
        this.state = 'PLAYING';
        this.ui.acquiredSkills.innerHTML = '';
        this.audioManager.startBGM();
    }
    spawnEnemy() {
        const lv = this.player.level;
        if (lv >= 15 && !this.bossSpawned && !this.bossDefeated) {
            this.enemies = []; this.enemyProjectiles = [];
            const bx = this.canvas.width / 2, by = 120;
            this.enemies.push(new Enemy(bx, by, 'boss', lv));
            this.bossSpawned = true;
            return;
        }
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
        if (this.player.level === 5 || this.player.level === 10) { pool = [...JOB_POOL]; pickCount = 2; }
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
        
        if (this.player.job === 'cyber' && this.frameCount % 10 === 0) {
            this.player.drones.forEach(d => {
                this.enemies.forEach(e => {
                    if (Utils.dist(d.x, d.y, e.x, e.y) < d.radius + e.radius) {
                        e.hp -= d.damage; this.skillManager.createFloatingText(e.x, e.y - 10, d.damage, false, '#0ff'); this.skillManager.createParticles(e.x, e.y, '#0ff');
                    }
                });
            });
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
                            e.hp -= atk.damage; this.skillManager.createFloatingText(e.x, e.y - 15, atk.damage, atk.isCrit);
                            e.knockbackX = Math.cos(a) * (atk.isFullCircle ? 25 : 15); e.knockbackY = Math.sin(a) * (atk.isFullCircle ? 25 : 15);
                            if (e.hp <= 0) {
                                this.skillManager.createParticles(e.x, e.y, e.color);
                                let gv = (e.type === 'ranged') ? 3 : (e.type === 'bomber' ? 5 : (e.type === 'elite' ? 10 : 1));
                                if (e.type === 'elite') for (let k = 0; k < 5; k++) this.gems.push(new Gem(e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, gv));
                                else if (e.type === 'boss') { for (let k = 0; k < 30; k++) this.gems.push(new Gem(e.x + Math.random() * 80 - 40, e.y + Math.random() * 80 - 40, 5)); this.bossDefeated = true; }
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
        document.getElementById('pause-stats').innerHTML = `<div>HP: ${p.hp}/${p.maxHp}</div><div>ATK: ${p.attackDamage}</div><div>RANGE: ${p.attackRange.toFixed(0)}</div><div>SPD: ${p.speed.toFixed(1)}</div><div>CRIT: ${(p.critChance*100).toFixed(0)}%</div>`;
        document.getElementById('pause-skills').innerHTML = this.ui.acquiredSkills.innerHTML || 'No Abilities';
    }
    addAcquiredSkillUI(skill) {
        let existing = this.ui.acquiredSkills.querySelector(`.acquired-icon[data-id="${skill.id}"]`);
        if (existing) {
            let countSpan = existing.querySelector('.skill-count') || document.createElement('span');
            countSpan.className = 'skill-count'; existing.dataset.count = (parseInt(existing.dataset.count) || 1) + 1;
            countSpan.innerText = `x${existing.dataset.count}`; existing.appendChild(countSpan);
        } else {
            const el = document.createElement('div'); el.className = 'acquired-icon'; el.dataset.id = skill.id;
            el.innerHTML = skill.icon; this.ui.acquiredSkills.appendChild(el);
        }
    }
    updateDevInfo() { if (this.player) document.getElementById('dev-info').innerHTML = `Lv: ${this.player.level} | HP: ${this.player.hp}/${this.player.maxHp}<br>Enemies: ${this.enemies.length}`; }
}
window.onload = () => { new Game(); };
