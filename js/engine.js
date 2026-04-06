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
        const cx = player.x + player.dirX * (player.attackRange / 2), cy = player.y + player.dirY * (player.attackRange / 2);
        const isCrit = Math.random() < player.critChance;
        this.attacks.push({ x: cx, y: cy, radius: player.attackRange / 1.5, angle: Math.atan2(player.dirY, player.dirX), life: 10, maxLife: 10, damage: isCrit ? player.attackDamage * 2 : player.attackDamage, isCrit });
    }
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1.0, decay: Math.random() * 0.05 + 0.05, color, size: Math.random() * 3 + 1 });
    }
    createFloatingText(x, y, text, isCrit = false, color = '#fff') { this.floatingTexts.push({ x, y, text, life: 1.0, vy: -1, isCrit, color }); }
    updateAndDraw(ctx) {
        this.attacks.forEach((atk, i) => {
            if (--atk.life <= 0) this.attacks.splice(i, 1);
            ctx.beginPath(); ctx.arc(atk.x, atk.y, atk.radius, atk.angle - Math.PI / 1.5, atk.angle + Math.PI / 1.5);
            ctx.lineWidth = 15 * (atk.life / atk.maxLife); ctx.strokeStyle = `rgba(0, 255, 255, ${atk.life / atk.maxLife})`;
            ctx.shadowBlur = 20; ctx.shadowColor = '#0ff'; ctx.stroke(); ctx.shadowBlur = 0;
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
            ctx.fillText(t.text, t.x, t.y); ctx.globalAlpha = 1.0;
        });
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas'); this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.CANVAS_WIDTH; this.canvas.height = CONFIG.CANVAS_HEIGHT;
        this.input = new InputHandler(); this.skillManager = new SkillManager();
        this.ui = {
            layer: document.getElementById('ui-layer'), levelup: document.getElementById('levelup-ui'),
            cards: document.getElementById('cards-container'), startBtn: document.getElementById('start-btn'),
            hp: document.getElementById('hp-bar'), exp: document.getElementById('exp-bar'),
            score: document.getElementById('score'), timer: document.getElementById('timer'), level: document.getElementById('player-level')
        };
        this.ui.startBtn.onclick = () => { this.ui.startBtn.blur(); this.init(); };
        this.state = 'TITLE'; this.loop();
    }
    init() {
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.enemies = []; this.gems = []; this.enemyProjectiles = []; this.score = 0; this.frameCount = 0; this.gameTime = 0;
        this.updateHUD(); this.ui.layer.classList.add('hidden'); this.ui.levelup.classList.add('hidden'); this.state = 'PLAYING';
    }
    spawnEnemy() {
        const { x, y } = Utils.getSpawnPos(this.canvas.width, this.canvas.height);
        let type = 'normal', r = Math.random();
        if (this.gameTime > 120 && this.frameCount % 600 === 0) type = 'elite';
        else if (this.gameTime > 60 && r < 0.2) type = 'bomber';
        else if (this.gameTime > 30 && r < 0.3) type = 'ranged';
        this.enemies.push(new Enemy(x, y, type, this.gameTime));
    }
    showLevelUpMenu() {
        this.state = 'PAUSED'; this.ui.levelup.classList.remove('hidden'); this.ui.cards.innerHTML = '';
        [...SKILL_POOL].sort(() => 0.5 - Math.random()).slice(0, 3).forEach(skill => {
            const card = document.createElement('div'); card.className = 'skill-card';
            card.innerHTML = `${skill.mostPick ? '<div class="most-pick">👍 Most Pick!</div>' : ''}<div class="skill-icon">${skill.icon}</div><div class="skill-info"><div class="skill-title">${skill.name}</div><div class="skill-desc">${skill.desc}</div></div>`;
            card.onclick = () => { this.player.applyUpgrade(skill.id); this.ui.levelup.classList.add('hidden'); this.updateHUD(); this.state = 'PLAYING'; };
            this.ui.cards.appendChild(card);
        });
    }
    updateHUD() {
        this.ui.hp.style.width = (this.player.hp / this.player.maxHp * 100) + '%';
        this.ui.exp.style.width = (this.player.exp / this.player.maxExp * 100) + '%';
        this.ui.score.innerText = this.score; this.ui.level.innerText = this.player.level;
        this.ui.timer.innerText = `${String(Math.floor(this.gameTime / 60)).padStart(2, '0')}:${String(this.gameTime % 60).padStart(2, '0')}`;
    }
    loop() {
        requestAnimationFrame(() => this.loop());
        this.ctx.fillStyle = '#050510'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#112'; this.ctx.lineWidth = 1; this.ctx.beginPath();
        for (let x = 0; x <= this.canvas.width; x += 40) { this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height); }
        for (let y = 0; y <= this.canvas.height; y += 40) { const off = (this.frameCount * 0.5) % 40; this.ctx.moveTo(0, y + off); this.ctx.lineTo(this.canvas.width, y + off); }
        this.ctx.stroke();
        if (this.state === 'TITLE' || this.state === 'GAMEOVER') { if (this.player) this.player.draw(this.ctx, this.frameCount); return; }
        if (this.state === 'PAUSED') { this.gems.forEach(g => g.draw(this.ctx)); this.enemies.forEach(e => e.draw(this.ctx, this.player.x, this.player.y)); this.enemyProjectiles.forEach(p => p.draw(this.ctx)); this.player.draw(this.ctx, this.frameCount); this.skillManager.updateAndDraw(this.ctx); return; }
        this.frameCount++; if (this.frameCount % 60 === 0) { this.gameTime++; this.updateHUD(); }
        this.player.update(this.input); if (this.input.keys.z && this.player.cooldown <= 0) { this.skillManager.triggerAttack(this.player); this.player.cooldown = this.player.maxCooldown; }
        if (this.frameCount % Math.max(10, 40 - Math.floor(this.gameTime / 5)) === 0) this.spawnEnemy();
        this.enemyProjectiles.forEach((p, i) => { p.update(this.player, this); p.draw(this.ctx); if (p.state === 'DONE') this.enemyProjectiles.splice(i, 1); });
        this.skillManager.attacks.forEach(atk => {
            // 공격 발생 후 초기 3프레임 동안 판정 수행 (판정 누락 방지)
            if (atk.life >= atk.maxLife - 3) {
                // 역순 순회를 통해 splice 시 인덱스 밀림 현상 방지
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const e = this.enemies[j];
                    const d = Utils.dist(e.x, e.y, atk.x, atk.y);
                    if (d < atk.radius + e.radius) {
                        const a = Utils.angle(this.player.x, this.player.y, e.x, e.y);
                        let diff = Math.abs(atk.angle - a); if (diff > Math.PI) diff = Math.PI * 2 - diff;
                        if (diff < Math.PI / 1.5) {
                            // 이미 이 공격에 맞은 적은 제외하고 싶다면 여기에 마킹 로직을 추가할 수 있으나, 
                            // 현재는 단순화를 위해 매 프레임 대미지를 입히지 않도록 체크가 필요할 수 있음.
                            // 여기서는 기존 로직의 의도를 살려 즉시 처리하되, 중복 피격을 막기 위해 
                            // 공격 객체에 피격자 목록을 관리하거나, 단순히 역순 순회만으로도 splice 버그는 해결됨.
                            
                            // [수정] 한 번의 공격(atk)에 동일한 적(e)이 여러 번 맞지 않도록 체크 추가
                            if (!atk.hitTargets) atk.hitTargets = new Set();
                            if (atk.hitTargets.has(e)) continue;
                            atk.hitTargets.add(e);

                            e.hp -= atk.damage; this.skillManager.createFloatingText(e.x, e.y - 15, atk.damage, atk.isCrit);
                            e.knockbackX = Math.cos(a) * 15; e.knockbackY = Math.sin(a) * 15;
                            if (e.hp <= 0) {
                                this.skillManager.createParticles(e.x, e.y, e.color);
                                if (e.type === 'elite') for (let k = 0; k < 5; k++) this.gems.push(new Gem(e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15));
                                else this.gems.push(new Gem(e.x, e.y));
                                this.enemies.splice(j, 1); this.score++;
                                if (this.player.vampireChance > 0 && Math.random() < this.player.vampireChance && this.player.hp < this.player.maxHp) {
                                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5);
                                    this.skillManager.createFloatingText(this.player.x, this.player.y - 20, '+5', false, '#4ade80');
                                }
                                this.updateHUD();
                            } else this.skillManager.createParticles(e.x, e.y, '#fff');
                        }
                    }
                }
            }
        });
        this.gems.forEach((g, i) => { g.update(this.player); g.draw(this.ctx); if (g.isCollected) { this.gems.splice(i, 1); if (this.player.gainExp(g.expValue)) this.showLevelUpMenu(); this.updateHUD(); } });
        this.enemies.forEach((e, i) => {
            e.update(this.player, this); if (e.hp <= 0) { this.enemies.splice(i, 1); return; }
            e.draw(this.ctx, this.player.x, this.player.y);
            if (Utils.dist(this.player.x, this.player.y, e.x, e.y) < this.player.radius + e.radius && !this.player.isDashing && this.player.invincible <= 0) {
                if (this.player.takeDamage(10)) this.triggerGameOver();
                this.updateHUD();
            }
        });
        this.player.draw(this.ctx, this.frameCount); this.skillManager.updateAndDraw(this.ctx);
    }
    triggerGameOver() {
        this.state = 'GAMEOVER'; this.skillManager.createParticles(this.player.x, this.player.y, this.player.neonColor);
        setTimeout(() => {
            this.ui.layer.classList.remove('hidden'); document.getElementById('game-title').innerText = "SYSTEM FAILED";
            this.ui.layer.querySelector('p').innerHTML = `LV: ${this.player.level} / 생존 시간: ${this.ui.timer.innerText} / 킬수: ${this.score}`;
            this.ui.startBtn.innerText = "REBOOT SYSTEM";
        }, 1000);
    }
}
window.onload = () => { new Game(); };
