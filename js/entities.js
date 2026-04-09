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
        this.job = null;
        this.combo = 0; this.comboTimer = 0;
        this.drones = [];
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

        // 콤보 타이머 관리 (1초 내에 다음 공격 안하면 초기화)
        if (this.comboTimer > 0) {
            if (--this.comboTimer <= 0) this.combo = 0;
        }

        // 드론 업데이트
        this.drones.forEach(d => d.update(this));
    }

    draw(ctx, frameCount) {
        if (this.invincible > 0 && Math.floor(frameCount / 4) % 2 === 0 && !this.isDashing) return;

        // 드론은 절대 좌표를 사용하므로 플레이어 translate 전에 그림 (더블 트랜스폼 방지)
        this.drones.forEach(d => d.draw(ctx));

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

    drawDeath(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = Math.random() < 0.5 ? '#fff' : this.color; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = Math.random() < 0.5 ? '#fff' : this.neonColor; ctx.stroke();
        ctx.rotate(Math.atan2(this.dirY, this.dirX));
        ctx.beginPath(); ctx.arc(0, 0, this.radius, -Math.PI / 3, Math.PI / 3);
        ctx.lineTo(this.radius + 8, 0); ctx.closePath();
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; ctx.fill();
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
            this.exp -= this.maxExp; this.maxExp = Math.floor(this.maxExp * 1.3); this.level++;
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
            // 전직
            case 'job_sword':
                this.job = 'swordmaster';
                this.attackDamage += 10;
                break;
            case 'job_cyber':
                this.job = 'cyber';
                if (this.drones.length === 0) {
                    this.drones.push(new Drone(0));
                    this.drones.push(new Drone(Math.PI)); // 초기 2대 (5레벨/10레벨 누적 가능)
                } else {
                    this.drones.push(new Drone(Math.PI / 2));
                    this.drones.push(new Drone(Math.PI * 1.5));
                }
                break;
        }
    }
}

class Drone {
    constructor(angle) {
        this.orbitAngle = angle;
        this.dist = 80;
        this.speed = 0.05;
        this.radius = 8;
        this.color = '#f7d774'; // 아이보리 골드
        this.damage = 5;
        this.x = 0; this.y = 0;
    }
    update(player) {
        this.orbitAngle += this.speed;
        // 드론의 좌표를 플레이어의 현재 좌표 기준으로 즉시 갱신
        this.x = player.x + Math.cos(this.orbitAngle) * this.dist;
        this.y = player.y + Math.sin(this.orbitAngle) * this.dist;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.orbitAngle + Math.PI / 2);

        // 드론 본체 (마름모/다이아몬드 형태)
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.5);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius * 1.5);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();

        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.stroke();

        // 코어 발광 (흰색 소형 원)
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, type, playerLevel) {
        this.x = x; this.y = y; this.type = type;
        this.speed = (Math.random() * 1 + 1.5 + (playerLevel * 0.05));
        this.maxHp = 10 + (playerLevel - 1) * 5;
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
        } else if (type === 'boss') {
            this.color = '#fbc531'; this.radius = 80; this.speed = 0.5;
            this.maxHp = 5000; this.knockbackResist = 0; // 넉백 완전 무시
            this.fireCooldown = 180; // 3초마다 3갈래 레이저
            this.burstCooldown = 240; // 폭발 쿨타임
            this.trackCooldown = 0; // 지속 추적 레이저 쿨타임
            this.lastHpThreshold = 10; // HP 10% 단위 추적 (10=100%, 9=90%...)
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
            else { game.enemyProjectiles.push(new LaserTelegraph(this.x, this.y, player.x, player.y, 60, 10, 40)); this.fireCooldown = 150; }
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
        } else if (this.type === 'boss') {
            // 보스는 넉백 무시
            this.knockbackX = 0; this.knockbackY = 0;
            // 보스 이동: 플레이어를 천천히 추적
            this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed;
            // 보스 경계 제한
            this.x = Utils.clamp(this.x, this.radius, CONFIG.CANVAS_WIDTH - this.radius);
            this.y = Utils.clamp(this.y, this.radius, CONFIG.CANVAS_HEIGHT - this.radius);

            // 패턴 1: 3갈래 레이저 (상시)
            if (this.fireCooldown > 0) this.fireCooldown--;
            else {
                for (let i = -1; i <= 1; i++) {
                    const spreadAngle = angle + i * (Math.PI / 6);
                    const tx = this.x + Math.cos(spreadAngle) * 500;
                    const ty = this.y + Math.sin(spreadAngle) * 500;
                    game.enemyProjectiles.push(new LaserTelegraph(this.x, this.y, tx, ty, 60, 25, 60));
                }
                this.fireCooldown = 180;
            }

            // 패턴 2: 근접 폭발 (HP 50% 이하)
            if (this.hp <= this.maxHp * 0.5) {
                if (this.burstCooldown > 0) this.burstCooldown--;
                else {
                    if (dist < 150 && !player.isDashing && player.invincible <= 0) {
                        player.takeDamage(20);
                        if (player.hp <= 0) game.triggerGameOver();
                        game.updateHUD();
                    }
                    game.skillManager.createParticles(this.x, this.y, '#fbc531');
                    game.skillManager.createParticles(this.x, this.y, '#f00');
                    game.skillManager.createParticles(this.x, this.y, '#fa0');
                    this.burstCooldown = 120;
                }
            }

            // 패턴 3: 지속 추적 얇은 레이저 (상시, 빠른 주기)
            if (this.trackCooldown > 0) this.trackCooldown--;
            else {
                game.enemyProjectiles.push(new LaserTelegraph(this.x, this.y, player.x, player.y, 30, 10, 30));
                this.trackCooldown = 60; // 1초마다
            }

            // HP 10% 감소마다 잡몹 소환
            const currentThreshold = Math.floor((this.hp / this.maxHp) * 10);
            if (currentThreshold < this.lastHpThreshold) {
                const spawnCount = 10 + Math.floor(Math.random() * 6); // 10~15마리
                const types = ['normal', 'normal', 'normal', 'ranged', 'bomber'];
                for (let i = 0; i < spawnCount; i++) {
                    const sp = Utils.getSpawnPos(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
                    const t = types[Math.floor(Math.random() * types.length)];
                    game.enemies.push(new Enemy(sp.x, sp.y, t, player.level));
                }
                this.lastHpThreshold = currentThreshold;
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
        if (this.type === 'boss') {
            // 1. 메인 쉘 (Casing) - 흰색 유선형
            ctx.fillStyle = '#f5f5f5';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius, this.radius * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.stroke();

            // 2. 내부 어두운 코어 (Inner Core)
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.ellipse(this.radius * 0.2, 0, this.radius * 0.6, this.radius * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 3. 센서 아이 (Eye Sensor) - 노란색 발광
            const eyeX = this.radius * 0.5;
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(eyeX, 0, 10, 0, Math.PI * 2);
            ctx.fill();

            // 센서 내부 디테일 (주황색 중심)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(eyeX, 0, 4, 0, Math.PI * 2);
            ctx.fill();

            // 4. 배선/디테일 (Support Lines)
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-this.radius * 0.5, -this.radius * 0.4);
            ctx.quadraticCurveTo(-this.radius * 1.2, -this.radius * 0.8, -this.radius * 1.4, 0);
            ctx.stroke();

            // 5. HP 바 표시 (보스 전용)
            ctx.rotate(-angle); // 회전 복구하여 HP바가 수평으로 보이도록
            const barW = 160, barH = 10;
            ctx.fillStyle = '#111'; ctx.fillRect(-barW / 2, -this.radius - 30, barW, barH);
            ctx.fillStyle = '#fbbf24'; ctx.fillRect(-barW / 2, -this.radius - 30, barW * (this.hp / this.maxHp), barH);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(-barW / 2, -this.radius - 30, barW, barH);

            ctx.restore();
            return; // 보스는 여기서 드로잉 종료
        }

        ctx.beginPath();
        if (this.type === 'elite') {
            for (let i = 0; i < 6; i++) ctx.lineTo(this.radius * Math.cos(i * Math.PI / 3), this.radius * Math.sin(i * Math.PI / 3));
        } else {
            ctx.moveTo(this.radius, 0); ctx.lineTo(-this.radius, this.radius * 0.7); ctx.lineTo(-this.radius * 0.5, 0); ctx.lineTo(-this.radius, -this.radius * 0.7);
        }
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
    constructor(x, y, expValue = 1) {
        this.x = x; this.y = y; this.size = 6; this.expValue = expValue;
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

class Magnet {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 12; this.color = '#fff'; this.isCollected = false;
    }
    update(player) {
        if (Utils.dist(this.x, this.y, player.x, player.y) < player.radius + this.radius) this.isCollected = true;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#111'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = this.color; ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.stroke();
        // 자석 말발굽 형태 간단히 표시
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI, true);
        ctx.lineWidth = 4; ctx.stroke();
        ctx.restore();
    }
}

class LaserTelegraph {
    constructor(x, y, targetX, targetY, delay, damage, width = 40) {
        this.x = x; this.y = y; this.angle = Utils.angle(x, y, targetX, targetY);
        this.width = width; this.length = 1500; this.delay = delay; this.initialDelay = delay;
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
