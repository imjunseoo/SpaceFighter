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
        this.vampireChance = 0;
        this.critChance = CONFIG.PLAYER.CRIT_CHANCE;
        this.critMultiplier = CONFIG.PLAYER.CRIT_MULTIPLIER;
        // 스킬 스택 카운터
        this.chainLightningStacks = 0; // 연쇄 번개 중첩 횟수
        // Prism 획득 여부
        this.has = { binding_king: false, reversal: false, berserk: false, blackhole: false, recovery: false,
                     kill_atk: false, kill_hp: false };
        this.recoveryUsed = false;     // 리커버리 발동 여부 (1회)
        this.bindingKingAura = 0;      // 아우라 애니메이션 프레임
        this.blackholes = [];          // 활성 블랙홀 목록
        // 아티팩트 시스템
        this.artifacts = [];           // 획득한 아티팩트 목록
        this.weaponArtifact = null;    // 장착된 무기 아티팩트
        this.killCount = 0;
        this.expMultiplier = 1.0;
        this.droneBulletCount = 1;
        this.toolFireRateBonus = 0;
        this.droneFireRateBonus = 0;
        this.toolBulletCount = 1;
        this.drones = [];
        this.pendingEvolution = null; // { icon, name } — 진화 연출 대기 신호
    }

    update(input) {
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (input.keys[' '] && this.dashCooldown <= 0 && !this.isDashing) {
            this.isDashing = true; this.dashTimer = 10; this.dashCooldown = this.maxDashCooldown; this.invincible = 15;
        }

        {
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
        }
        if (this.cooldown > 0) this.cooldown--;
        if (this.invincible > 0) this.invincible--;

        // 속박의 왕 아우라 프레임 증가
        if (this.has.binding_king) this.bindingKingAura++;
        // 블랙홀 업데이트
        for (let i = this.blackholes.length - 1; i >= 0; i--) {
            const bh = this.blackholes[i];
            if (--bh.life <= 0) { this.blackholes.splice(i, 1); }
        }
        // 버서커: 체력 30% 이하 시 쿨타임 단축 반영 (매 프레임 cooldown 추가 감소)
        if (this.has.berserk && this.hp <= this.maxHp * 0.3 && this.cooldown > 0) {
            this.cooldown--;  // 추가 1 감소 → 사실상 2배 속도
        }

        // 드론 업데이트
        this.drones.forEach(d => d.update(this));
    }

    draw(ctx, frameCount) {
        if (this.invincible > 0 && Math.floor(frameCount / 4) % 2 === 0 && !this.isDashing) return;

        // 드론은 절대 좌표를 사용하므로 플레이어 translate 전에 그림 (더블 트랜스폼 방지)
        this.drones.forEach(d => d.draw(ctx));

        // 속박의 왕 — 플레이어 머리 위 붉은 왕관
        if (this.has.binding_king) {
            const bobY = Math.sin(this.bindingKingAura * 0.08) * 2; // 살짝 위아래로 떠있는 느낌
            ctx.save();
            ctx.translate(this.x, this.y - this.radius - 14 + bobY);
            ctx.shadowBlur = 18; ctx.shadowColor = '#f00';

            const cw = 18, ch = 12; // 왕관 너비/높이
            ctx.beginPath();
            // 왕관 밑변
            ctx.moveTo(-cw, ch / 2);
            ctx.lineTo(cw, ch / 2);
            // 오른쪽 아래 → 오른쪽 위 뾰족
            ctx.lineTo(cw, -ch / 2);
            ctx.lineTo(cw * 0.5, ch * 0.1);
            // 중앙 뾰족 (가장 높음)
            ctx.lineTo(0, -ch);
            ctx.lineTo(-cw * 0.5, ch * 0.1);
            // 왼쪽 위 뾰족 → 왼쪽 아래
            ctx.lineTo(-cw, -ch / 2);
            ctx.closePath();

            ctx.fillStyle = '#1a0000';
            ctx.fill();
            ctx.strokeStyle = '#ff2020';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 왕관 위 보석 3개 (중앙/좌/우 끝점)
            [{ x: 0, y: -ch }, { x: cw, y: -ch / 2 }, { x: -cw, y: -ch / 2 }].forEach(pt => {
                ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ff6060'; ctx.fill();
            });

            ctx.restore();
        }
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
        const dmg = this.has.binding_king ? amount * 2 : amount;
        this.hp -= dmg; this.invincible = 30;
        // 리커버리: 사망 직전 1회 부활
        if (this.hp <= 0 && !this.recoveryUsed && this.has.recovery) {
            this.hp = this.maxHp;
            this.recoveryUsed = true;
            return false; // 죽지 않음 — engine.js에서 shockwave 트리거 신호
        }
        return this.hp <= 0;
    }

    gainExp(amount) {
        this.exp += Math.floor(amount * this.expMultiplier);
        let leveledUp = false;
        // 한 번에 exp가 대량으로 들어와도 정확히 레벨업 횟수만큼 처리
        while (this.exp >= this.maxExp) {
            this.exp -= this.maxExp;
            this.level++;
            if (this.level < 15) {
                this.maxExp = Math.floor(this.maxExp * 1.3);
            }
            leveledUp = true;
        }
        return leveledUp;
    }

    applyUpgrade(skillId) {
        // ── 아티팩트 처리 ──────────────────────────────────────────────
        const artifactDef = ARTIFACT_POOL.find(a => a.id === skillId);
        if (artifactDef) {
            const existing = this.artifacts.find(a => a.defId === skillId);
            if (existing) {
                existing.stacks++;
                // 5중첩 → 진화
                if (existing.stacks >= 5 && artifactDef.evolves_to) {
                    existing.defId = artifactDef.evolves_to;
                    existing.stacks = 1;
                    if (artifactDef.category === 'weapon') this.weaponArtifact = existing;
                    // 드론: 기존 드론 전부 제거 후 Tier 2 드론 1대 소환
                    if (artifactDef.category === 'drone') {
                        this.drones = [];
                        this.drones.push(new ArtifactDrone(existing, 0));
                    }
                    const evolvedDef = ARTIFACT_POOL.find(a => a.id === existing.defId);
                    this.pendingEvolution = { icon: evolvedDef?.icon || '✨', name: evolvedDef?.name || 'EVOLVED' };
                } else if (artifactDef.category === 'drone' && this.drones.length < 5) {
                    // 드론 중첩: 새 ArtifactDrone 추가 (최대 5대)
                    this.drones.push(new ArtifactDrone(existing, 0));
                    this.drones.forEach((d, i) => { d.orbitAngle = (Math.PI * 2 / this.drones.length) * i; });
                }
            } else {
                const newArt = { defId: skillId, category: artifactDef.category, stacks: 1, cooldown: 0 };
                this.artifacts.push(newArt);
                if (artifactDef.category === 'weapon') {
                    this.weaponArtifact = newArt;
                } else if (artifactDef.category === 'drone') {
                    this.drones.push(new ArtifactDrone(newArt, 0));
                    this.drones.forEach((d, i) => { d.orbitAngle = (Math.PI * 2 / this.drones.length) * i; });
                }
            }
            return;
        }

        // ── 어빌리티 카드 처리 ────────────────────────────────────────
        switch (skillId) {
            case 'output_module':   this.attackDamage += 5; break;
            case 'endurance_up':    this.maxHp += 100; this.hp = Math.min(this.maxHp, this.hp + 100); break;
            case 'speed_boost':     this.speed += 0.5; break;
            case 'crit_logic':      this.critChance += 0.1; break;
            case 'crit_research':   this.critMultiplier += 0.10; break;
            case 'vampire_circuit': this.vampireChance += 0.05; break;
            case 'weapon_atkspd':
                if (this.weaponArtifact) {
                    const def = ARTIFACT_POOL.find(a => a.id === this.weaponArtifact.defId);
                    if (def) def.attack.cooldown = Math.max(5, Math.round(def.attack.cooldown * 0.85));
                }
                break;
            case 'tool_fire_rate':    this.toolFireRateBonus += 0.2; break;
            case 'tool_multishot':    this.toolBulletCount++; break;
            case 'drone_fire_rate':   this.droneFireRateBonus = Math.min(0.8, this.droneFireRateBonus + 0.2); break;
            case 'drone_multishot':   this.droneBulletCount++; break;
            case 'exp_boost':         this.expMultiplier += 0.3; break;
            case 'kill_atk':          this.has.kill_atk = true; break;
            case 'kill_hp':           this.has.kill_hp  = true; break;
            case 'chain_lightning':   this.chainLightningStacks++; break;
            case 'binding_king':
                this.has.binding_king = true;
                this.attackDamage += this.attackDamage * 2;
                break;
            case 'reversal': {
                this.has.reversal = true;
                const tmp = this.attackDamage;
                this.attackDamage = this.maxHp;
                this.maxHp = tmp;
                this.hp = Math.min(this.hp, this.maxHp);
                break;
            }
            case 'berserk':   this.has.berserk = true; break;
            case 'blackhole': this.has.blackhole = true; break;
            case 'recovery':  this.has.recovery = true; break;
        }
    }
}

class ArtifactDrone {
    constructor(artifactRef, angle) {
        this.artifactRef = artifactRef; // { defId, category, stacks, cooldown }
        this.orbitAngle = angle;
        this.dist = 80; this.speed = 0.05; this.radius = 8;
        this.color = '#f7d774';
        this.x = 0; this.y = 0;
        this.fireCooldown = 0;
    }
    get def() { return ARTIFACT_POOL.find(a => a.id === this.artifactRef.defId); }
    get readyToFire() { return this.fireCooldown <= 0; }
    resetCooldown(player) {
        const base = this.def?.attack?.cooldown || 150;
        const fireRateFactor = 1 - (player.droneFireRateBonus || 0);
        this.fireCooldown = Math.max(8, Math.round(base * player.maxCooldown / CONFIG.PLAYER.MAX_COOLDOWN * fireRateFactor));
    }
    update(player) {
        this.orbitAngle += this.speed;
        this.x = player.x + Math.cos(this.orbitAngle) * this.dist;
        this.y = player.y + Math.sin(this.orbitAngle) * this.dist;
        if (this.fireCooldown > 0) {
            this.fireCooldown--;
            if (player.has.berserk && player.hp <= player.maxHp * 0.3) this.fireCooldown--;
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.orbitAngle + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.5);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius * 1.5);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        ctx.fillStyle = '#111'; ctx.fill();
        ctx.strokeStyle = this.color; ctx.lineWidth = 2;
        ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, type, playerLevel, game) {
        this.x = x; this.y = y; this.type = type;
        const elapsedMinutes = game?.infiniteElapsedMinutes ?? 0;
        const infiniteBonus = game?.infiniteModeActive ? Math.pow(1.15, elapsedMinutes) : 1;
        this.speed = (Math.random() * 1 + 1.5 + (playerLevel * 0.08));
        this.maxHp = (10 + (playerLevel - 1) * 8) * infiniteBonus;
        this.radius = 10; this.color = '#f00'; this.knockbackResist = 1;
        this.contactDamage = 10 + Math.floor(playerLevel / 10) * 2;

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
        // Phase 2 보이드 침식: 보스1 처치 이후 생성되는 일반 적에 보라색 변이 적용
        if (game && game.bossDefeated && type === 'normal') {
            this.color = '#c050f0';
        }
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
                    if (dist < 100 && !player.isDashing && player.invincible <= 0) { if (player.takeDamage(30)) game.triggerGameOver(); else game.checkRecoveryTrigger(); game.updateHUD(); }
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
                        if (player.takeDamage(20)) game.triggerGameOver(); else game.checkRecoveryTrigger();
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
                    game.enemies.push(new Enemy(sp.x, sp.y, t, player.level, game));
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

class DroneMissile {
    // guided=true : 유도 미사일 (메카닉)
    // guided=false: 직선 발사체 (오버로드, Kai'Sa Q 스타일)
    constructor(x, y, target, damageRatio, guided = true, dirAngle = 0) {
        this.x = x; this.y = y;
        this.startX = x; this.startY = y;
        this.target = target;
        this.damageRatio = damageRatio;
        this.guided = guided;
        this.angle = guided ? Utils.angle(x, y, target.x, target.y) : dirAngle;
        // 로그 곡선용: progress 0→1, 수직 진폭 (좌/우 랜덤)
        this.progress = 0;
        this.progressSpeed = 0.055; // ~18프레임(0.3초)에 도달
        this.amplitude = (Math.random() > 0.5 ? 1 : -1) * (55 + Math.random() * 75);
        this.travelDist = 0;
        this.maxTravelDist = 580;
        this.speed = 13; // 비유도 전용
        this.radius = 5;
        this.aoeRadius = 80;
        this.color = '#f7d774';
    }
    update() {
        if (this.guided) {
            const prevX = this.x, prevY = this.y;
            this.progress = Math.min(1, this.progress + this.progressSpeed);
            const tx = this.target.x, ty = this.target.y;
            const dx = tx - this.startX, dy = ty - this.startY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            // 수직 단위벡터
            const px = -dy / dist, py = dx / dist;
            // 로그 오프셋: 초반에 급격히 꺾이고 타겟 도달 시 0으로 수렴
            const offset = this.amplitude * Math.log(1 + this.progress * 10) * (1 - this.progress);
            this.x = this.startX + dx * this.progress + px * offset;
            this.y = this.startY + dy * this.progress + py * offset;
            // 렌더링용 방향각 갱신
            const fdx = this.x - prevX, fdy = this.y - prevY;
            if (fdx !== 0 || fdy !== 0) this.angle = Math.atan2(fdy, fdx);
        } else {
            this.travelDist += this.speed;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }
    }
    hitCheck() {
        if (this.guided) return this.progress >= 0.98;
        return this.travelDist >= this.maxTravelDist;
    }
    // 비유도 전용: 비행 중 적 충돌 체크
    collidesWithEnemy(enemies) {
        if (this.guided) return false;
        return enemies.some(e => Utils.dist(this.x, this.y, e.x, e.y) < e.radius + this.radius);
    }
    draw(ctx) {
        ctx.save();
        // 레이저 빔 몸통 — 비행 방향 반대로 꼬리 연장
        const tailLen = 22;
        const tx = this.x - Math.cos(this.angle) * tailLen;
        const ty = this.y - Math.sin(this.angle) * tailLen;
        // 외곽 글로우 (넓고 흐릿)
        const grd = ctx.createLinearGradient(tx, ty, this.x, this.y);
        grd.addColorStop(0, 'rgba(255,230,80,0)');
        grd.addColorStop(1, 'rgba(255,230,80,0.9)');
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 5;
        ctx.shadowBlur = 14; ctx.shadowColor = '#ffe050';
        ctx.stroke();
        // 코어 라인 (밝고 얇음)
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = '#fff9c4';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 6; ctx.shadowColor = '#fff';
        ctx.stroke();
        // 선두 광점
        ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12; ctx.shadowColor = '#ffe050';
        ctx.fill();
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

class Bullet {
    constructor(x, y, angle, damage, color = '#ff0', speed = 15, size = 5, isCrit = false, piercing = false) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.damage = damage; this.color = color; this.size = size;
        this.isCrit = isCrit; this.piercing = piercing;
        this.hitTargets = new Set();
        this.isAlive = true;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.isShuriken) this.spinAngle = (this.spinAngle || 0) + 0.25;
        if (this.x < -50 || this.x > CONFIG.CANVAS_WIDTH + 50 || this.y < -50 || this.y > CONFIG.CANVAS_HEIGHT + 50) this.isAlive = false;
    }
    draw(ctx) {
        ctx.save();
        if (this.isShuriken) {
            const r = this.size * 1.5;
            const inner = r * 0.32;
            const blades = 4;
            const isBomb = this.isBombShuriken;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.spinAngle || 0);
            ctx.shadowBlur = isBomb ? 28 : 18;
            ctx.shadowColor = this.isCrit ? '#fff' : (isBomb ? '#ff4400' : '#a0f0ff');
            ctx.fillStyle = this.isCrit ? '#ffffff' : (isBomb ? '#ff8800' : '#c8f8ff');
            ctx.beginPath();
            for (let i = 0; i < blades; i++) {
                const a = (Math.PI * 2 / blades) * i;
                const aL = a - 0.55;
                const aR = a + 0.55;
                ctx.lineTo(Math.cos(aL) * inner, Math.sin(aL) * inner);
                ctx.lineTo(Math.cos(a) * r,     Math.sin(a) * r);
                ctx.lineTo(Math.cos(aR) * inner, Math.sin(aR) * inner);
            }
            ctx.closePath(); ctx.fill();
            // 중심 원
            ctx.beginPath(); ctx.arc(0, 0, inner * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = this.isCrit ? '#aef' : (isBomb ? '#ff2200' : '#60c0d0'); ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color; ctx.shadowBlur = 15; ctx.shadowColor = this.color;
            ctx.fill();
        }
        ctx.restore();
    }
}

// ── 2차 보스: 글리치 위버 ────────────────────────────────────────────────────────
class GlitchWeaver {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.type = 'glitch_weaver';
        this.maxHp = 30000; this.hp = this.maxHp;
        this.speed = 0.35; this.radius = 72;
        this.color = '#0ff';
        this.knockbackX = 0; this.knockbackY = 0;
        this.knockbackResist = 0;
        this.contactDamage = 25;
        // 파편 공전
        this.fragmentAngle = 0; this.fragmentCount = 6;
        // 패턴 쿨타임
        this.gemReverseCooldown = 540;  // 9초 후 첫 발동
        this.gemReverseWarning = 0;    // 전조 타이머 (90프레임 카운트다운)
        this.glitchCageCooldown = 900;  // 15초 후 첫 발동
        this.minionSpawnCooldown = 240;  // 4초 후 첫 발동
        // 글리치 쉬프트: HP 20% 소실마다 순간이동 (5 = 100%)
        this.lastHpThreshold = 5;
    }

    update(player, game) {
        this.knockbackX = 0; this.knockbackY = 0;
        const angle = Utils.angle(this.x, this.y, player.x, player.y);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
        this.x = Utils.clamp(this.x, this.radius, CONFIG.CANVAS_WIDTH - this.radius);
        this.y = Utils.clamp(this.y, this.radius, CONFIG.CANVAS_HEIGHT - this.radius);
        this.fragmentAngle += 0.025;

        // 젬 리버스: 90프레임 전조 후 실행
        if (this.gemReverseWarning > 0) {
            this.gemReverseWarning--;
            if (this.gemReverseWarning % 5 === 0) {
                game.skillManager.createParticles(this.x, this.y, '#0ff');
                game.skillManager.createParticles(this.x, this.y, '#f0f');
            }
            if (this.gemReverseWarning === 0) game.triggerGemReverse(this);
        } else if (--this.gemReverseCooldown <= 0) {
            this.gemReverseCooldown = 900;
            this.gemReverseWarning = 90;
            game.showToast('GEM REVERSE INCOMING', '⚠️');
        }
        if (--this.glitchCageCooldown <= 0) { this.glitchCageCooldown = 1800; game.triggerGlitchCage(); }
        if (--this.minionSpawnCooldown <= 0) { this.minionSpawnCooldown = 240; game.triggerGlitchMinionSpawn(); }

        const threshold = Math.floor((this.hp / this.maxHp) * 5);
        if (threshold < this.lastHpThreshold) { this.lastHpThreshold = threshold; game.triggerGlitchShift(this); }
    }

    draw(ctx) {
        const coreR = this.radius * 0.42;
        const orbR = this.radius * 0.88;

        // 젬 리버스 전조: 바깥에서 코어로 수축하는 흡수 링 + 보스 진동
        let shakeX = 0, shakeY = 0;
        if (this.gemReverseWarning > 0) {
            const wProg = (90 - this.gemReverseWarning) / 90;
            // 바깥(250px)에서 코어(0)로 수축하는 외곽 링
            const pulseR = Math.max(6, 250 * (1 - wProg));
            // 링 1 — 굵은 주 링
            ctx.save();
            ctx.beginPath(); ctx.arc(this.x, this.y, pulseR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + wProg * 0.45})`;
            ctx.lineWidth = 8 + wProg * 20;
            ctx.shadowBlur = 60; ctx.shadowColor = '#0ff';
            ctx.stroke(); ctx.restore();
            // 링 2 — 약간 앞서 수축하는 보조 링 (시안+마젠타 혼합)
            const pulseR2 = Math.max(4, 180 * (1 - wProg));
            ctx.save();
            ctx.beginPath(); ctx.arc(this.x, this.y, pulseR2, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(180, 0, 255, ${0.35 + wProg * 0.55})`;
            ctx.lineWidth = 5 + wProg * 12;
            ctx.shadowBlur = 50; ctx.shadowColor = '#f0f';
            ctx.stroke(); ctx.restore();
            shakeX = (Math.random() - 0.5) * (wProg * 10);
            shakeY = (Math.random() - 0.5) * (wProg * 10);
        }

        // 색수차(Chromatic Aberration): R / C / 화이트 코어 3패스
        [
            { dx: -4 + shakeX, dy: shakeY, c: 'rgba(255,50,50,0.55)', sc: '#f55' },
            { dx: 4 + shakeX, dy: shakeY, c: 'rgba(50,255,255,0.55)', sc: '#5ff' },
            { dx: 0 + shakeX, dy: shakeY, c: 'rgba(210,210,255,0.9)', sc: '#ccf' }
        ].forEach(({ dx, dy, c, sc }) => {
            ctx.save(); ctx.translate(this.x + dx, this.y + dy);
            // 코어 링
            ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2);
            ctx.strokeStyle = c; ctx.lineWidth = 4;
            ctx.shadowBlur = 22; ctx.shadowColor = sc; ctx.stroke();
            // 궤도 파편 (기하학적 사각형 6개)
            for (let i = 0; i < this.fragmentCount; i++) {
                const fa = this.fragmentAngle + (i / this.fragmentCount) * Math.PI * 2;
                const fx = Math.cos(fa) * orbR, fy = Math.sin(fa) * orbR;
                ctx.save(); ctx.translate(fx, fy); ctx.rotate(fa + this.fragmentAngle * 1.5);
                const s = 12;
                ctx.beginPath(); ctx.rect(-s / 2, -s / 2, s, s);
                ctx.fillStyle = '#111'; ctx.fill();
                ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        });

        // 내부 코어 (단일 패스)
        ctx.save(); ctx.translate(this.x + shakeX, this.y + shakeY);
        ctx.beginPath(); ctx.arc(0, 0, coreR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#050010'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 35; ctx.shadowColor = '#0ff'; ctx.fill();
        ctx.restore();

        // HP 바
        const barW = 230, barH = 12;
        const ratio = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#111'; ctx.fillRect(this.x - barW / 2, this.y - this.radius - 40, barW, barH);
        ctx.fillStyle = `hsl(${Math.round(180 * ratio)}, 100%, 55%)`;
        ctx.fillRect(this.x - barW / 2, this.y - this.radius - 40, barW * ratio, barH);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.strokeRect(this.x - barW / 2, this.y - this.radius - 40, barW, barH);
        // 보스 이름
        ctx.save(); ctx.font = 'bold 13px Consolas'; ctx.textAlign = 'center';
        ctx.fillStyle = '#0ff'; ctx.shadowBlur = 12; ctx.shadowColor = '#0ff';
        ctx.fillText('GLITCH WEAVER', this.x, this.y - this.radius - 46); ctx.restore();
    }
}

class LaserTelegraph {
    constructor(x, y, targetX, targetY, delay, damage, width = 40, length = 1500) {
        this.x = x; this.y = y; this.angle = Utils.angle(x, y, targetX, targetY);
        this.width = width; this.length = length; this.delay = delay; this.initialDelay = delay;
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
                        if (player.takeDamage(this.damage)) game.triggerGameOver(); else game.checkRecoveryTrigger();
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
