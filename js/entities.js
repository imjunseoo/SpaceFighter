class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = CONFIG.PLAYER.RADIUS;
        this.color = '#222'; this.neonColor = '#0ff';
        this.speed = CONFIG.PLAYER.SPEED;
        this.maxHp = CONFIG.PLAYER.MAX_HP; this.hp = this.maxHp;
        this.attackDamage = CONFIG.PLAYER.ATTACK_DAMAGE;
        this.attackRange = CONFIG.PLAYER.ATTACK_RANGE;
        this.maxCooldown = CONFIG.PLAYER.MAX_COOLDOWN; this.cooldown = 0;
        this.pickupRange = CONFIG.PLAYER.PICKUP_RANGE;
        this.invincible = 0;
        this.level = 1; this.exp = 0; this.maxExp = 10;
        this.dirX = 1; this.dirY = 0;
        this.isDashing = false; this.dashTimer = 0;
        this.maxDashCooldown = CONFIG.PLAYER.MAX_DASH_COOLDOWN; this.dashCooldown = 0;
        this.vampireChance = 0; this.critChance = 0;
    }

    update(input) {
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (input.keys[' '] && this.dashCooldown <= 0 && !this.isDashing) {
            this.isDashing = true; this.dashTimer = 10; this.dashCooldown = this.maxDashCooldown; this.invincible = 15;
        }

        let dx = 0, dy = 0;
        if (!this.isDashing) {
            if (input.keys.ArrowUp) dy -= 1; if (input.keys.ArrowDown) dy += 1;
            if (input.keys.ArrowLeft) dx -= 1; if (input.keys.ArrowRight) dx += 1;
            if (dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                this.x += (dx / len) * this.speed; this.y += (dy / len) * this.speed;
                this.dirX = dx / len; this.dirY = dy / len;
            }
        } else {
            this.x += this.dirX * (this.speed * 3); this.y += this.dirY * (this.speed * 3);
            if (--this.dashTimer <= 0) this.isDashing = false;
        }

        this.x = Utils.clamp(this.x, this.radius, CONFIG.CANVAS_WIDTH - this.radius);
        this.y = Utils.clamp(this.y, this.radius, CONFIG.CANVAS_HEIGHT - this.radius);
        if (this.cooldown > 0) this.cooldown--;
        if (this.invincible > 0) this.invincible--;
    }

    draw(ctx, frameCount) {
        if (this.invincible > 0 && Math.floor(frameCount / 4) % 2 === 0 && !this.isDashing) return;
        ctx.save(); ctx.translate(this.x, this.y);
        if (this.isDashing) { ctx.scale(1.3, 0.7); ctx.globalAlpha = 0.5; }
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = this.neonColor; ctx.stroke();
        ctx.rotate(Math.atan2(this.dirY, this.dirX));
        ctx.beginPath(); ctx.arc(0, 0, this.radius, -Math.PI / 3, Math.PI / 3);
        ctx.lineTo(this.radius + 8, 0); ctx.closePath();
        ctx.fillStyle = this.neonColor; ctx.shadowBlur = 15; ctx.shadowColor = this.neonColor; ctx.fill();
        ctx.restore();
    }

    takeDamage(amount) {
        if (this.invincible > 0) return false;
        this.hp -= amount; this.invincible = 30;
        return this.hp <= 0;
    }

    gainExp(amount) {
        this.exp += amount;
        if (this.exp >= this.maxExp) {
            this.exp -= this.maxExp; this.maxExp = Math.floor(this.maxExp * 1.5); this.level++;
            return true;
        }
        return false;
    }

    applyUpgrade(skillId) {
        switch (skillId) {
            case 'cd_down': this.maxCooldown *= 0.85; break;
            case 'dmg_up': this.attackDamage += 5; break;
            case 'range_up': this.attackRange *= 1.25; break;
            case 'hp_up': this.maxHp += 20; this.hp = Math.min(this.maxHp, this.hp + 30); break;
            case 'speed_up': this.speed *= 1.15; break;
            case 'pickup_up': this.pickupRange *= 1.5; break;
            case 'dash_cd_down': this.maxDashCooldown *= 0.7; break;
            case 'vampire': this.vampireChance += 0.15; break;
            case 'crit_rate': this.critChance += 0.2; break;
        }
    }
}

class Enemy {
    constructor(x, y, type, gameTime) {
        this.x = x; this.y = y; this.type = type;
        this.speed = (Math.random() * 1 + 1.5 + (gameTime / 120));
        this.maxHp = 10 + Math.floor(gameTime / 30) * 5;
        this.radius = 10; this.color = '#f00'; this.knockbackResist = 1;

        if (type === 'ranged') {
            this.color = '#0ff'; this.radius = 12; this.speed *= 0.8; this.maxHp *= 0.8;
            this.fireCooldown = Math.random() * 60 + 60;
        } else if (type === 'bomber') {
            this.color = '#fa0'; this.radius = 14; this.speed *= 1.2; this.maxHp *= 1.5;
            this.fuse = 0;
        } else if (type === 'elite') {
            this.color = '#f0f'; this.radius = 24; this.speed *= 0.6; this.maxHp *= 10;
            this.knockbackResist = 0.2;
        }
        this.hp = this.maxHp; this.knockbackX = 0; this.knockbackY = 0;
    }

    update(player, game) {
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * this.knockbackResist; this.y += this.knockbackY * this.knockbackResist;
            this.knockbackX *= 0.8; this.knockbackY *= 0.8; return;
        }
        const dist = Utils.dist(this.x, this.y, player.x, player.y);
        const angle = Utils.angle(this.x, this.y, player.x, player.y);

        if (this.type === 'ranged') {
            if (dist > 250) { this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; }
            else if (dist < 200) { this.x -= Math.cos(angle) * this.speed * 0.5; this.y -= Math.sin(angle) * this.speed * 0.5; }
            if (this.fireCooldown > 0) this.fireCooldown--;
            else { game.enemyProjectiles.push(new LaserTelegraph(this.x, this.y, player.x, player.y, 60, 20)); this.fireCooldown = 150; }
        } else if (this.type === 'bomber') {
            if (this.fuse > 0) {
                if (--this.fuse <= 0) {
                    if (dist < 100 && !player.isDashing && player.invincible <= 0) player.takeDamage(30);
                    game.skillManager.createParticles(this.x, this.y, '#fa0');
                    game.skillManager.createParticles(this.x, this.y, '#f00');
                    this.hp = 0;
                }
            } else {
                this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed;
                if (dist < 60) this.fuse = 30;
            }
        } else { this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed; }
    }

    draw(ctx, targetX, targetY) {
        const angle = Utils.angle(this.x, this.y, targetX, targetY);
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(angle);
        let color = this.color;
        if (this.type === 'bomber' && this.fuse > 0) {
            color = (Math.floor(this.fuse / 4) % 2 === 0) ? '#fff' : '#f00';
            const scale = 1.2 + (30 - this.fuse) / 100; ctx.scale(scale, scale);
        }
        ctx.beginPath();
        if (this.type === 'elite') { for (let i = 0; i < 6; i++) ctx.lineTo(this.radius * Math.cos(i * Math.PI / 3), this.radius * Math.sin(i * Math.PI / 3)); }
        else { ctx.moveTo(this.radius, 0); ctx.lineTo(-this.radius, this.radius * 0.7); ctx.lineTo(-this.radius * 0.5, 0); ctx.lineTo(-this.radius, -this.radius * 0.7); }
        ctx.closePath();
        ctx.fillStyle = this.hp < this.maxHp ? '#fff' : (this.type === 'bomber' && this.fuse > 0 ? '#f00' : '#111');
        ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.shadowBlur = 10; ctx.shadowColor = color; ctx.stroke(); 
        
        ctx.shadowBlur = 0;
        if (this.type === 'bomber' && this.fuse > 0) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.1 + (60 - this.fuse) / 60 * 0.4})`;
            ctx.fillStyle = `rgba(255, 0, 0, ${0.05 + (60 - this.fuse) / 60 * 0.1})`;
            ctx.beginPath();
            ctx.arc(0, 0, 100, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }
        ctx.restore();
    }
}

class Gem {
    constructor(x, y) {
        this.x = x; this.y = y; this.size = 6; this.expValue = 1;
        this.isAttracted = false; this.isCollected = false; this.color = '#4ade80';
    }
    update(player) {
        const d = Utils.dist(this.x, this.y, player.x, player.y);
        if (d < player.pickupRange) this.isAttracted = true;
        if (this.isAttracted) {
            const a = Utils.angle(this.x, this.y, player.x, player.y);
            this.x += Math.cos(a) * 12; this.y += Math.sin(a) * 12;
            if (d < player.radius + 10) this.isCollected = true;
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Date.now() / 200);
        ctx.beginPath(); ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fill(); ctx.restore();
    }
}

class LaserTelegraph {
    constructor(x, y, targetX, targetY, delay, damage) {
        this.x = x; this.y = y; this.angle = Utils.angle(x, y, targetX, targetY);
        this.width = 60; this.length = 1500; this.delay = delay; this.initialDelay = delay;
        this.activeFrames = 15; this.damage = damage; this.state = 'WARNING';
    }
    update(player, game) {
        if (this.state === 'WARNING') {
            if (--this.delay <= 0) {
                this.state = 'FIRING';
                game.audioManager.playLaser(); // 정확한 빔 발사 프레임에서 사운드 발생
                const dx = player.x - this.x, dy = player.y - this.y;
                const rx = dx * Math.cos(-this.angle) - dy * Math.sin(-this.angle);
                const ry = dx * Math.sin(-this.angle) + dy * Math.cos(-this.angle);
                if (rx > 0 && rx < this.length && Math.abs(ry) < (this.width / 2) + player.radius) {
                    if (!player.isDashing && player.invincible <= 0) {
                        if (player.takeDamage(this.damage)) game.triggerGameOver();
                        game.updateHUD(); game.skillManager.createParticles(player.x, player.y, '#f00');
                    }
                }
            }
        } else if (this.state === 'FIRING' && --this.activeFrames <= 0) this.state = 'DONE';
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        if (this.state === 'WARNING') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)'; ctx.fillRect(0, -this.width / 2, this.length, this.width);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; ctx.lineWidth = 1; ctx.strokeRect(0, -this.width / 2, this.length, this.width);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; ctx.fillRect(0, -this.width / 2, this.length * (1 - this.delay / this.initialDelay), this.width);
        } else if (this.state === 'FIRING') {
            ctx.fillStyle = '#f0f'; ctx.shadowBlur = 20; ctx.shadowColor = '#f0f'; ctx.fillRect(0, -this.width / 2, this.length, this.width);
            ctx.fillStyle = '#fff'; ctx.fillRect(0, -this.width / 4, this.length, this.width / 2);
        }
        ctx.restore();
    }
}
