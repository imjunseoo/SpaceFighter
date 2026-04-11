# [대규모 리마스터] Space Fighter: Artifact & Ability System Overhaul

## 개요

'직업(JOB) 카드 시스템'을 **완전 폐지**하고, 플레이어의 기본 공격 자체를 **아티팩트(Weapon)**으로 대체하는 핵심 시스템 전환 패치다. 기존 직업 코드(소드마스터, 거너, 메카닉 등)의 로직은 **삭제하지 않고**, 각각 대응하는 아티팩트/드론 클래스 내부로 이전·재활용한다. 어빌리티 풀도 기획 명세에 맞게 전면 개편한다.

---

## ⚠️ User Review Required

> [!CAUTION]
> 이 패치는 기존 직업 시스템(JOB_POOL, `player.job`, `showAdvancementMenu` 등)을 **완전 제거**합니다. 되돌리기 어려운 구조 변경이므로, 실행 전 **Git 커밋(백업)**을 반드시 먼저 진행합니다.

> [!IMPORTANT]
> **무기 선택 창(게임 시작 시 1회)** UI가 신규 추가됩니다. 기존 레벨업 카드 창(`showLevelUpMenu`)을 재활용하여 구현합니다.

> [!WARNING]
> 기획에 따라 `lens_expand`(범위), `coolant_pump`(쿨타임), `surge_cathode`(대시 크리) 어빌리티는 **완전 삭제**됩니다.

---

## 설계 의도

| 기존 | 변경 후 |
|---|---|
| Lv.5 직업 선택 → 공격 방식 변경 | 게임 시작 시 무기(아티팩트) 1개 선택 |
| 보스 처치 후 2차 전직 | 동일 아티팩트 5중첩 → 자동 2티어 진화 |
| 직업이 공격 방식 결정 | **무기 아티팩트**가 공격(Z키) 방식 결정 |
| 스폰 간격: 레벨 기반 | 스폰 간격: 레벨(일반 모드) / 시간(무한 모드) |

---

## Proposed Changes

### 1. `js/config.js` — 데이터 테이블 전면 개편

#### [MODIFY] [config.js](file:///c:/Users/imjun/OneDrive/Desktop/Space%20Fighter/js/config.js)

**1-1. `JOB_POOL` 완전 삭제**
- `const JOB_POOL = [...]` 블록 전체 제거.

**1-2. `SKILL_POOL` 개편 (어빌리티 카드 풀)**

```js
// 새 어빌리티 풀 (등급별)
const SKILL_POOL = [
    // ── Bronze ──────────────────────────────────────────────
    { id: 'output_module',     grade: 'bronze', name: '출력 모듈',     icon: '⚡', desc: '공격력 <span class="highlight">+5</span> 증가.' },
    { id: 'endurance_up',      grade: 'bronze', name: '지속력 증가',   icon: '❤️', desc: '최대 체력 및 현재 체력 <span class="highlight">+100</span> 증가.' },
    { id: 'speed_boost',       grade: 'bronze', name: '추진기 과부하', icon: '💨', desc: '이동 속도 <span class="highlight">+0.5</span> 증가.' },
    { id: 'crit_logic',        grade: 'bronze', name: '치명로직',      icon: '🎯', desc: '치명타 확률 <span class="highlight">+10%</span> 증가.' },
    { id: 'crit_research',     grade: 'bronze', name: '치명로직 연구', icon: '🔬', desc: '치명타 피해 계수 <span class="highlight">+10%</span> 증가.' },
    { id: 'vampire_circuit',   grade: 'bronze', name: '흡혈 회로',     icon: '🩸', desc: '적 처치 시 <span class="highlight">5% 확률</span>로 HP 3 회복. (중복 시 확률 합산)' },

    // ── Silver ──────────────────────────────────────────────
    { id: 'weapon_atkspd',     grade: 'silver', name: '무기 공속 강화',    icon: '⏩', desc: '장착 무기(Z)의 공격 쿨타임 <span class="highlight">-15%</span> 감소.' },
    { id: 'tool_fire_rate',    grade: 'silver', name: '도구 발사 속도',    icon: '🔧', desc: '도구(Tool) 아티팩트의 투사체 생성 속도 <span class="highlight">+20%</span> 증가.' },
    { id: 'weapon_multishot',  grade: 'silver', name: '다중 투사체',       icon: '🔱', desc: '무기(Z) 공격 시 투사체를 <span class="highlight">+1개</span> 추가 발사.' },
    { id: 'drone_multishot',   grade: 'silver', name: '드론 탄두 증설',   icon: '🤖', desc: '드론(Drone) 아티팩트의 발사 투사체 수 <span class="highlight">+1개</span> 증가.' },

    // ── Gold ────────────────────────────────────────────────
    { id: 'exp_boost',         grade: 'gold', name: '데이터 수집 가속',   icon: '📈', desc: '경험치 획득량 <span class="highlight">+30%</span> 증가.' },
    { id: 'kill_atk',          grade: 'gold', name: '전투 데이터 학습',   icon: '📊', desc: '킬수 <span class="highlight">100마다 공격력 +1</span> 증가.' },
    { id: 'kill_hp',           grade: 'gold', name: '생체 강화 프로토콜', icon: '🧬', desc: '킬수 <span class="highlight">100마다 최대 체력 +100</span> 증가.' },
    { id: 'chain_lightning',   grade: 'gold', name: '연쇄 번개',          icon: '🌩️', desc: '크리티컬 적중 시 3마리에게 번개 방출. <span class="highlight">데미지: 10 × 스택</span>.' },

    // ── Prism ────────────────────────────────────────────────
    { id: 'binding_king', grade: 'prism', name: '명명백백한 속박의 왕', icon: '👑', desc: '받는 피해 <span class="highlight">×2</span>. 대신 현재 공격력의 <span class="highlight">2배</span>를 추가로 획득.', unique: true },
    { id: 'reversal',     grade: 'prism', name: '반전술식',     icon: '🔀', desc: '획득 즉시 HP와 공격력 수치를 <span class="highlight">서로 맞바꿈</span>.', unique: true },
    { id: 'berserk',      grade: 'prism', name: '프로토콜: 버서커', icon: '😡', desc: '체력 30% 이하 시 공격 속도 <span class="highlight">+50%</span> 폭증.', unique: true },
    { id: 'blackhole',    grade: 'prism', name: '특이점(블랙홀) 생성', icon: '🕳️', desc: '공격 시 <span class="highlight">1% 확률</span>로 3초간 소형 블랙홀 생성.', unique: true },
    { id: 'recovery',     grade: 'prism', name: '리커버리',     icon: '💊', desc: '사망 시 HP 100% 회복 및 주변 적 파괴. <span class="highlight">단 1회</span>.', unique: true },
];
```

**1-3. `ARTIFACT_POOL` 신규 추가**
```js
// 아티팩트 데이터 정의
// category: 'weapon' | 'tool' | 'drone'
// tier: 1 | 2
const ARTIFACT_POOL = [
    // ── Weapon (Z키 공격) ────────────────────────────────────────────
    {
        id: 'whip', tier: 1, category: 'weapon', evolves_to: 'pain_whip',
        name: '채찍', icon: '🪢',
        desc: '(Z) 전방 부채꼴 근접 공격. <span class="highlight">100%</span> 대미지.',
        attack: { type: 'melee_arc', damageRatio: 1.0, range: 120, arc: Math.PI / 1.5, cooldown: 25 }
    },
    {
        id: 'pain_whip', tier: 2, category: 'weapon',
        name: '고통', icon: '⛓️',
        desc: '(Z) 전방 광범위 근접 공격. <span class="highlight">100%</span> 대미지. 범위 대폭 확장.',
        attack: { type: 'melee_arc', damageRatio: 1.0, range: 220, arc: Math.PI / 1.2, cooldown: 25 }
    },
    {
        id: 'pistol', tier: 1, category: 'weapon', evolves_to: 'rifle',
        name: '권총', icon: '🔫',
        desc: '(Z) 탄환 발사. <span class="highlight">100%</span> 대미지.',
        attack: { type: 'bullet', damageRatio: 1.0, speed: 18, size: 5, cooldown: 20 }
    },
    {
        id: 'rifle', tier: 2, category: 'weapon',
        name: '소총', icon: '🎯',
        desc: '(Z) 탄환 연사. <span class="highlight">100%</span> 대미지. 연사 속도 대폭 증가.',
        attack: { type: 'bullet', damageRatio: 1.0, speed: 22, size: 5, cooldown: 10 }
    },
    {
        id: 'sword', tier: 1, category: 'weapon', evolves_to: 'holy_sword',
        name: '검', icon: '⚔️',
        desc: '(Z) 360도 근접 공격. <span class="highlight">100%</span> 대미지.',
        attack: { type: 'full_circle', damageRatio: 1.0, range: 100, cooldown: 30 }
    },
    {
        id: 'holy_sword', tier: 2, category: 'weapon',
        name: '성검', icon: '🗡️',
        desc: '(Z) 360도 근접 공격. <span class="highlight">150%</span> 대미지. 공속 증가.',
        attack: { type: 'full_circle', damageRatio: 1.5, range: 120, cooldown: 22 }
    },

    // ── Tool (자동 사격) ─────────────────────────────────────────────
    {
        id: 'shuriken', tier: 1, category: 'tool', evolves_to: 'bomb_shuriken',
        name: '수리검', icon: '✴️',
        desc: '(자동) 사거리 내 적에게 투사체 자동 발사. <span class="highlight">50%</span> 대미지.',
        attack: { type: 'auto_bullet', damageRatio: 0.5, range: 350, speed: 16, size: 5, cooldown: 50 }
    },
    {
        id: 'bomb_shuriken', tier: 2, category: 'tool',
        name: '폭발 수리검', icon: '💥',
        desc: '(자동) 폭발 투사체 자동 발사. <span class="highlight">70%</span> 범위 피해.',
        attack: { type: 'auto_aoe_bullet', damageRatio: 0.7, range: 400, speed: 16, size: 6, aoeRadius: 80, cooldown: 50 }
    },

    // ── Drone (공전 자동 공격) ───────────────────────────────────────
    {
        id: 'illegal_drone', tier: 1, category: 'drone', evolves_to: 'military_drone',
        name: '불법 드론', icon: '🛸',
        desc: '(드론) 플레이어 주변을 공전하며 유도 미사일 자동 발사. <span class="highlight">50%</span> 대미지.',
        attack: { type: 'drone_missile', damageRatio: 0.5, range: 350, cooldown: 150 }
    },
    {
        id: 'military_drone', tier: 2, category: 'drone',
        name: '군용 드론', icon: '⚙️',
        desc: '(드론) 융단 포격. 사거리 내 복수의 적에게 동시 미사일 발사. <span class="highlight">70%</span> 대미지.',
        attack: { type: 'drone_carpet', damageRatio: 0.7, range: 600, cooldown: 120, burstCount: 4 }
    },
];
```

**1-4. `CONFIG.PLAYER` 기본 스탯 조정**
```js
 PLAYER: {
    ...
    ATTACK_DAMAGE: 50,     // 유지
    CRIT_CHANCE: 0.10,     // 신규 (10%)
    CRIT_MULTIPLIER: 1.5,  // 신규 (150%) — 기존 2.0에서 하향 조정
    MAX_HP: 100,           // 유지
}
```

---

### 2. `js/entities.js` — Player 및 아티팩트 클래스 개편

#### [MODIFY] [entities.js](file:///c:/Users/imjun/OneDrive/Desktop/Space%20Fighter/js/entities.js)

**2-1. `Player` 생성자 변경**

| 항목 | 변경 내용 |
|---|---|
| `this.job` | **삭제** |
| `this.combo`, `this.comboTimer` | **삭제** (콤보 시스템 제거) |
| `this.charging`, `this.chargeTimer`, `this.chargeReady` | **삭제** |
| `this.critChance` | `CONFIG.PLAYER.CRIT_CHANCE` (0.10) 으로 초기화 |
| `this.critMultiplier` | `CONFIG.PLAYER.CRIT_MULTIPLIER` (1.5) 으로 초기화 |
| `this.artifacts` | **신규**: `[]` — 획득한 아티팩트 목록 |
| `this.weaponArtifact` | **신규**: `null` — 장착된 무기 아티팩트 |
| `this.killCount` | **신규**: `0` — 킬 카운터 |
| `this.expMultiplier` | **신규**: `1.0` — 경험치 배율 |
| `this.droneBulletCount` | **신규**: `1` — 드론 투사체 수 |
| `this.toolFireRateBonus` | **신규**: `0` — 도구 발사 속도 보너스 |
| `this.weaponMultishot` | **신규**: `0` — 무기 추가 발사 수 |

**2-2. `Player.applyUpgrade(skillId)` 전면 개편**

```js
applyUpgrade(skillId) {
    // ── 아티팩트 획득 처리 (ARTIFACT_POOL에서 id 매칭) ────────────────
    const artifactDef = ARTIFACT_POOL.find(a => a.id === skillId);
    if (artifactDef) {
        const existing = this.artifacts.find(a => a.defId === skillId);
        if (existing) {
            existing.stacks++;
            // 5중첩 → 진화
            if (existing.stacks >= 5 && artifactDef.evolves_to) {
                existing.defId = artifactDef.evolves_to;
                existing.stacks = 1;
                // 무기라면 weaponArtifact 갱신
                if (artifactDef.category === 'weapon') {
                    this.weaponArtifact = existing;
                }
            }
        } else {
            const newArtifact = { defId: skillId, category: artifactDef.category, stacks: 1 };
            this.artifacts.push(newArtifact);
            if (artifactDef.category === 'weapon') {
                this.weaponArtifact = newArtifact;
            } else if (artifactDef.category === 'drone') {
                // 드론 생성
                this.drones.push(new ArtifactDrone(newArtifact, 
                    (Math.PI * 2 / (this.drones.length + 1)) * this.drones.length));
            }
            // tool은 engine.js에서 자동 사격 처리 (별도 클래스 불필요)
        }
        return;
    }

    // ── 어빌리티 카드 처리 ────────────────────────────────────────────
    switch(skillId) {
        case 'output_module': this.attackDamage += 5; break;
        case 'endurance_up': this.maxHp += 100; this.hp = Math.min(this.maxHp, this.hp + 100); break;
        case 'speed_boost': this.speed += 0.5; break;
        case 'crit_logic': this.critChance += 0.1; break;
        case 'crit_research': this.critMultiplier += 0.10; break;
        case 'vampire_circuit': this.vampireChance += 0.05; break;
        case 'weapon_atkspd':
            if (this.weaponArtifact) {
                const def = ARTIFACT_POOL.find(a => a.id === this.weaponArtifact.defId);
                if (def) def.attack.cooldown = Math.max(5, def.attack.cooldown * 0.85);
            }
            break;
        case 'tool_fire_rate': this.toolFireRateBonus += 0.2; break;
        case 'weapon_multishot': this.weaponMultishot++; break;
        case 'drone_multishot': this.droneBulletCount++; break;
        case 'exp_boost': this.expMultiplier += 0.3; break;
        case 'kill_atk':   /* engine.js killEnemy에서 처리 */ this.has.kill_atk = true; break;
        case 'kill_hp':    /* engine.js killEnemy에서 처리 */ this.has.kill_hp = true; break;
        case 'chain_lightning': this.chainLightningStacks++; break;
        // Prism
        case 'binding_king': this.has.binding_king = true; this.attackDamage += this.attackDamage * 2; break;
        case 'reversal': { 
            this.has.reversal = true; 
            const tmp = this.attackDamage; 
            this.attackDamage = this.maxHp; 
            this.maxHp = tmp; 
            this.hp = Math.min(this.hp, this.maxHp); 
            break; 
        }
        case 'berserk': this.has.berserk = true; break;
        case 'blackhole': this.has.blackhole = true; break;
        case 'recovery': this.has.recovery = true; break;
    }
}
```

**2-3. `Drone` 클래스 → `ArtifactDrone` 으로 개편**

기존 `Drone` 클래스를 확장하여, `artifactRef`(획득한 아티팩트 객체)를 참조하고 `defId`에 따라 다른 공격 방식(`drone_missile` vs `drone_carpet`)을 수행하도록 리팩토링.

```js
class ArtifactDrone {
    constructor(artifactRef, angle) {
        this.artifactRef = artifactRef; // { defId, category, stacks }
        this.orbitAngle = angle;
        this.dist = 80; this.speed = 0.05; this.radius = 8;
        this.fireCooldown = 0;
        // 드론마다 실시간으로 ARTIFACT_POOL에서 def 조회
    }
    get def() { return ARTIFACT_POOL.find(a => a.id === this.artifactRef.defId); }
    get readyToFire() { return this.fireCooldown <= 0; }
    resetCooldown(player) {
        const base = this.def?.attack?.cooldown || 150;
        this.fireCooldown = Math.max(8, Math.round(base * player.maxCooldown / CONFIG.PLAYER.MAX_COOLDOWN));
    }
    update(player) { /* 기존 Drone.update 로직 동일 */ }
    draw(ctx) { /* 기존 Drone.draw 로직 동일 */ }
}
```

**2-4. `Enemy` 클래스 — 무한 모드 스탯 변경**

무한 모드 진입 후 적의 HP/속도를 **레벨** 기반이 아닌 **경과 시간(분)** 기반으로 변경.

```js
// Enemy 생성자 내부
// 기존: const infiniteBonus = 1 + Math.max(0, playerLevel - 30) * 0.04;
// 변경:
const elapsedMinutes = game?.infiniteElapsedMinutes ?? 0; // engine.js에서 관리
const infiniteBonus = game?.infiniteModeActive 
    ? Math.pow(1.15, elapsedMinutes)  // 1분마다 15% 기하급수적 증가
    : 1;

// 일반 모드 적 스탯: 레벨 기반 유지
this.maxHp = (10 + (playerLevel - 1) * 8) * infiniteBonus;
this.speed = (Math.random() * 1 + 1.5 + (playerLevel * 0.08));
// Lv.10 마다 공격력 소폭 증가
this.contactDamage = 10 + Math.floor(playerLevel / 10) * 2;
```

---

### 3. `js/engine.js` — 게임 루프 및 공격 로직 전면 개편

#### [MODIFY] [engine.js](file:///c:/Users/imjun/OneDrive/Desktop/Space%20Fighter/js/engine.js)

**3-1. `Game.init()` 변경**

```js
// 삭제할 항목
this.bossSpawned, this.bossDefeated (유지),
this.advancementPending, this.advancementShown (삭제)

// 추가할 항목
this.infiniteElapsedMinutes = 0; // 무한 모드 경과 분 수
```

**3-2. 무기 선택 창 — 게임 시작 시 1회 표시**

`Game.init()` 호출 시 레벨업 UI를 재활용해 **무기 선택 창**을 먼저 표시:
- `WEAPON`(Z키) 카테고리 아티팩트 정의(`pistol`, `whip`, `sword`)를 카드로 제시
- 선택 시 `player.applyUpgrade(id)` 호출 → `player.weaponArtifact` 설정 후 게임 시작
- 이후 레벨업 카드 풀에는 선택한 무기만 등장 (동일 무기 중첩 → 진화 유도)

```js
showWeaponSelectMenu() {
    // state = 'PAUSED_WEAPON_SELECT'
    // 레벨업 UI(levelup, cards) 재활용
    // 모든 tier:1, category:'weapon' 아티팩트 3장 제시
    // 선택 완료 시 state = 'PLAYING'
}
```

**3-3. `showLevelUpMenu()` 개편**

- `JOB_POOL` 관련 코드(Lv.5 직업 선택 분기) **삭제**
- `showAdvancementMenu()` 호출 코드 **삭제** (보스 처치 시 더 이상 직업 선택 창을 띄우지 않음)
- **카드 선택 로직**: 
  - `어빌리티(SKILL_POOL)`와 `아티팩트(ARTIFACT_POOL)`를 **동일한 확률**로 섞어서 3장을 뽑습니다.
  - 무기 아티팩트는 플레이어가 처음에 선택한 무기 종류(또는 현재 장착 중인 무기)만 풀에 포함됩니다.
  - 현재 무기가 이미 2티어(진화 완료)라면 무기 카드는 등장하지 않습니다.

**3-4. Z키 공격 로직 재작성**

```js
// 기존 job 기반 분기 전면 삭제
// 신규: weaponArtifact 기반 처리

if (this.input.keys.z && this.player.cooldown <= 0 && this.player.weaponArtifact) {
    const def = ARTIFACT_POOL.find(a => a.id === this.player.weaponArtifact.defId);
    if (!def) return;
    const atk = def.attack;
    const multishot = this.player.weaponMultishot;

    if (atk.type === 'melee_arc') {
        // 채찍/고통: 부채꼴 근접 공격
        this.triggerArtifactMeleeArc(atk, multishot);
    } else if (atk.type === 'full_circle') {
        // 검/성검: 360도 근접 공격
        this.triggerArtifactFullCircle(atk);
    } else if (atk.type === 'bullet') {
        // 권총/소총: 탄환 발사
        this.triggerArtifactBullet(atk, multishot);
    }
    this.player.cooldown = atk.cooldown;
    this.audioManager.playSwordSlash();
}
```

**각 공격 함수 내에는 치명타, 흡혈, 젬 드롭 로직(`processHit`)이 반드시 포함된다.**


**3-5. 드론 공격 로직 — `ArtifactDrone` 기반 재작성**

```js
// 기존: job === 'mecha' / job === 'overload' 분기 삭제
// 신규: player.drones.forEach → ArtifactDrone.def.attack.type 기반 분기

this.player.drones.forEach(d => {
    if (!d.readyToFire) return;
    const def = d.def?.attack;
    if (!def) return;

    if (def.type === 'drone_missile') {
        // 불법 드론: 가장 가까운 적 1명 유도 미사일
    } else if (def.type === 'drone_carpet') {
        // 군용 드론: burstCount개 복수 타겟 동시 발사
    }
    d.resetCooldown(this.player);
});
```

**3-6. 도구(Tool) 자동 발사 처리 — 신규 추가**

```js
// player.artifacts.filter(a => a.category === 'tool')
// 도구 아티팩트 중 사거리 내 가장 가까운 적 자동 조준

this.player.artifacts.filter(a => a.category === 'tool').forEach(toolArt => {
    const def = ARTIFACT_POOL.find(d => d.id === toolArt.defId);
    if (!def || toolArt.cooldown > 0) { toolArt.cooldown--; return; }
    const cooldown =Math.max(15, def.attack.cooldown * (1 - this.player.toolFireRateBonus));
    // 사격 처리 (auto_bullet / auto_aoe_bullet)
    toolArt.cooldown = cooldown;
});
```

**3-7. `killEnemy()` 개편**

```js
// kill_atk, kill_hp 어빌리티 처리 추가
this.score++;
// 킬 카운터 누적
this.player.killCount++;
if (this.player.has.kill_atk && this.player.killCount % 100 === 0) this.player.attackDamage++;
if (this.player.has.kill_hp  && this.player.killCount % 100 === 0) {
    this.player.maxHp += 100;
    this.skillManager.createFloatingText(this.player.x, this.player.y - 20, '+100 MAX HP', false, '#4ade80');
}
// 흡혈 처리 (processHit에서 이미 처리하므로 killEnemy에선 삭제 검토 — 현 위치 유지 가능)
```

**3-8. `gainExp()` 개편**

```js
// expMultiplier 반영
gainExp(amount) {
    const actual = Math.floor(amount * this.player.expMultiplier);
    // 기존 로직과 동일
}
```

**3-9. 무한 모드 난이도 — 시간 기반 스케일링**

```js
// 무한 모드 경과 시간 추적 (매 60초마다 증가)
if (this.infiniteModeActive && this.frameCount % 3600 === 0) {
    this.infiniteElapsedMinutes++;
    // 선택: 일정 분마다 토스트 알림
    if (this.infiniteElapsedMinutes % 5 === 0) {
        this.showToast(`THREAT LEVEL ${this.infiniteElapsedMinutes}`, '⚠️');
    }
}
// 적 스폰 간격도 시간 기반으로:
const infiniteInterval = Math.max(8, 20 - Math.floor(this.infiniteElapsedMinutes * 1.5));
```

---

### 4. `index.html` — UI 레이아웃 추가

#### [MODIFY] [index.html](file:///c:/Users/imjun/OneDrive/Desktop/Space%20Fighter/index.html)

**4-1. 아티팩트 UI (화면 왼쪽 하단)**
```html
<!-- 현재 획득 어빌리티 표시 위치: acquiredSkills (오른쪽 하단) → 유지 -->
<!-- 추가: 아티팩트 아이콘 + 중첩 수 표시 (왼쪽 하단) -->
<div id="artifact-tray" class="fixed bottom-4 left-4 flex flex-col gap-2">
    <!-- JS에서 동적 생성: artifact-icon 요소들 -->
</div>
```

**4-2. 어빌리티 UI (화면 오른쪽 하단)**
- 기존 `acquiredSkills` 위치 유지

---

## 구현 시 주의사항 (Coder 지침)

> [!IMPORTANT]
> 1. **모든 공격 경로**(`triggerArtifactMeleeArc`, `triggerArtifactBullet`, `triggerArtifactFullCircle`, 도구 자동 사격, 드론 미사일 폭발)는 반드시 **`processHit()`를 경유**해야 하며, 내부에 치명타(isCrit) · 흡혈(vampireChance) · 젬드롭(killEnemy) 처리가 포함되어야 합니다.

> [!IMPORTANT]
> 2. **evolves_to(진화)** 발동 시 UI 토스트 메시지(`showToast`)와 파티클 이펙트를 출력해야 합니다.

> [!WARNING]
> 3. 기존 `player.job` 참조 지점(engine.js 내 `z키 공격`, `드론 미사일`, `advancementMenu`, `showAdvancementMenu` 등)을 모두 발견하여 제거/대체해야 합니다.

> [!NOTE]
> 4. 백업: 작업 시작 전 `git commit -am "backup: pre-artifact-remaster"` 실행.

---

## Verification Plan

### 자동/수동 검증 체크리스트

| 검증 항목 | 방법 |
|---|---|
| 게임 시작 시 무기 선택 창 표시 | 브라우저 실행 → 미션 시작 클릭 |
| 무기 선택 후 Z키 공격 동작 | 각 무기(채찍/권총/검) 선택 후 Z키 테스트 |
| 레벨업 카드에 선택 무기만 등장 | Dev Tools로 레벨업 강제 후 카드 확인 |
| 아티팩트 5중첩 → 2티어 진화 | Dev Tools 레벨업 버튼으로 빠른 획득 테스트 |
| 도구 아티팩트 자동 사격 | 수리검 획득 후 적 근처에서 자동 발사 확인 |
| 드론 아티팩트 공전 + 발사 | 불법 드론 획득 후 드론 공전 + 미사일 확인 |
| 무한 모드 시간 기반 스케일링 | 무한 모드 진입 후 5분 이상 생존 후 체감 |
| 킬100 마다 스탯 증가 | kill_atk/kill_hp 획득 후 킬 100 달성 확인 |
| processHit 경유 확인 | 모든 공격 시 플로팅 데미지 텍스트 표시 여부 |
