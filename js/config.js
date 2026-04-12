const CONFIG = {
    CANVAS_WIDTH: 1920,
    CANVAS_HEIGHT: 1080,
    GRID_SIZE: 40,
    PLAYER: {
        START_X: 960,
        START_Y: 540,
        RADIUS: 16,
        SPEED: 4,
        MAX_HP: 100,
        ATTACK_DAMAGE: 50,
        ATTACK_RANGE: 120,
        MAX_COOLDOWN: 25,
        PICKUP_RANGE: 80,
        MAX_DASH_COOLDOWN: 90,
        CRIT_CHANCE: 0.10,
        CRIT_MULTIPLIER: 1.5
    }
};

// 어빌리티 카드 풀 - 4등급 (Bronze / Silver / Gold / Prism)
const SKILL_POOL = [
    // ── Bronze ──────────────────────────────────────────────
    { id: 'output_module',    grade: 'bronze', name: '출력 모듈',       icon: '⚡', desc: '공격력 <span class="highlight">+5</span> 증가.' },
    { id: 'endurance_up',     grade: 'bronze', name: '지속력 증가',     icon: '❤️', desc: '최대 체력 및 현재 체력 <span class="highlight">+100</span> 증가.' },
    { id: 'speed_boost',      grade: 'bronze', name: '추진기 과부하',   icon: '💨', desc: '이동 속도 <span class="highlight">+0.5</span> 증가.' },
    { id: 'crit_logic',       grade: 'bronze', name: '치명로직',        icon: '🎯', desc: '치명타 확률 <span class="highlight">+10%</span> 증가.' },
    { id: 'crit_research',    grade: 'bronze', name: '치명로직 연구',   icon: '🔬', desc: '치명타 피해 계수 <span class="highlight">+10%</span> 증가.' },
    { id: 'vampire_circuit',  grade: 'bronze', name: '흡혈 회로',       icon: '🩸', desc: '적 처치 시 <span class="highlight">5% 확률</span>로 HP 3 회복. (중복 시 확률 합산)' },

    // ── Silver ──────────────────────────────────────────────
    { id: 'weapon_atkspd',    grade: 'silver', name: '무기 공속 강화',    icon: '⏩', desc: '장착 무기(Z)의 공격 쿨타임 <span class="highlight">-15%</span> 감소.' },
    { id: 'tool_fire_rate',   grade: 'silver', name: '도구 발사 속도',    icon: '🔧', desc: '도구(Tool) 아티팩트의 투사체 생성 속도 <span class="highlight">+20%</span> 증가.' },
    { id: 'tool_multishot',   grade: 'silver', name: '보조 무장 투사체 증설', icon: '🔱', desc: '도구(Tool) 카테고리 아티팩트의 발사 수 <span class="highlight">+1개</span> 증가. 부채꼴로 퍼져 발사.' },
    { id: 'drone_fire_rate',  grade: 'silver', name: '드론 연사 강화',    icon: '📡', desc: '드론 아티팩트의 발사 쿨타임 <span class="highlight">-20%</span> 감소.' },
    { id: 'drone_multishot',  grade: 'silver', name: '드론 탄두 증설',   icon: '🤖', desc: '드론(Drone) 아티팩트의 발사 투사체 수 <span class="highlight">+1개</span> 증가.' },

    // ── Gold ────────────────────────────────────────────────
    { id: 'exp_boost',        grade: 'gold', name: '데이터 수집 가속',   icon: '📈', desc: '경험치 획득량 <span class="highlight">+30%</span> 증가.' },
    { id: 'kill_atk',         grade: 'gold', name: '전투 데이터 학습',   icon: '📊', desc: '킬수 <span class="highlight">100마다 공격력 +1</span> 증가.' },
    { id: 'kill_hp',          grade: 'gold', name: '생체 강화 프로토콜', icon: '🧬', desc: '킬수 <span class="highlight">100마다 최대 체력 +100</span> 증가.' },
    { id: 'chain_lightning',  grade: 'gold', name: '연쇄 번개',          icon: '🌩️', desc: '크리티컬 적중 시 3마리에게 번개 방출. <span class="highlight">데미지: 10 × 스택</span>.' },

    // ── Prism ────────────────────────────────────────────────
    { id: 'binding_king', grade: 'prism', name: '명명백백한 속박의 왕', icon: '👑', desc: '받는 피해 <span class="highlight">×2</span>. 대신 현재 공격력의 <span class="highlight">2배</span>를 추가로 획득.', unique: true },
    { id: 'reversal',     grade: 'prism', name: '반전술식',     icon: '🔀', desc: '획득 즉시 HP와 공격력 수치를 <span class="highlight">서로 맞바꿈</span>.', unique: true },
    { id: 'berserk',      grade: 'prism', name: '프로토콜: 버서커', icon: '😡', desc: '체력 30% 이하 시 공격 속도 <span class="highlight">+50%</span> 폭증.', unique: true },
    { id: 'blackhole',    grade: 'prism', name: '특이점(블랙홀) 생성', icon: '🕳️', desc: '공격 시 <span class="highlight">1% 확률</span>로 3초간 소형 블랙홀 생성.', unique: true },
    { id: 'recovery',     grade: 'prism', name: '리커버리',     icon: '💊', desc: '사망 시 HP 100% 회복 및 주변 적 파괴. <span class="highlight">단 1회</span>.', unique: true },
];

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
        id: 'pain_whip', tier: 2, category: 'weapon', evolves_to: 'domination_whip',
        name: '고통', icon: '⛓️',
        desc: '(Z) 전방 광범위 근접 공격. <span class="highlight">100%</span> 대미지. 범위 대폭 확장.',
        attack: { type: 'melee_arc', damageRatio: 2.0, range: 220, arc: Math.PI / 1.2, cooldown: 25 }
    },
    {
        id: 'domination_whip', tier: 3, category: 'weapon', evolves_to: 'extinction_whip',
        name: '지배', icon: '❌',
        desc: '(Z) X자 광역 참격. <span class="highlight">250%</span> 대미지.',
        attack: { type: 'x_shape', damageRatio: 2.5, range: 260, cooldown: 28 }
    },
    {
        id: 'extinction_whip', tier: 4, category: 'weapon',
        name: '소멸', icon: '💀',
        desc: '(Z) X자 참격 0.5초 유지 후 강력한 폭발. <span class="highlight">300%+폭발</span> 대미지.',
        attack: { type: 'x_linger_explode', damageRatio: 3.0, range: 280, cooldown: 35, explosionRatio: 5.0, explosionRadius: 220 }
    },
    {
        id: 'pistol', tier: 1, category: 'weapon', evolves_to: 'rifle',
        name: '권총', icon: '🔫',
        desc: '(Z) 탄환 발사. <span class="highlight">100%</span> 대미지.',
        attack: { type: 'bullet', damageRatio: 1.0, speed: 18, size: 5, cooldown: 20 }
    },
    {
        id: 'rifle', tier: 2, category: 'weapon', evolves_to: 'negotiation',
        name: '소총', icon: '🎯',
        desc: '(Z) 탄환 연사. <span class="highlight">100%</span> 대미지. 연사 속도 대폭 증가.',
        attack: { type: 'bullet', damageRatio: 2.0, speed: 22, size: 5, cooldown: 10 }
    },
    {
        id: 'negotiation', tier: 3, category: 'weapon', evolves_to: 'judgment',
        name: '협상', icon: '🌠',
        desc: '(Z) 유성 탄환 3연사. <span class="highlight">150%×3</span> 대미지.',
        attack: { type: 'bullet_burst', damageRatio: 1.5, speed: 26, size: 7, cooldown: 18, burstCount: 3 }
    },
    {
        id: 'judgment', tier: 4, category: 'weapon',
        name: '응징', icon: '⚡',
        desc: '(Z) 관통 레이저 발사. 궤적에 범위 폭발 피해. <span class="highlight">500%+범위</span>.',
        attack: { type: 'piercing_laser', damageRatio: 5.0, cooldown: 30, aoeRadius: 70 }
    },
    {
        id: 'sword', tier: 1, category: 'weapon', evolves_to: 'holy_sword',
        name: '검', icon: '⚔️',
        desc: '(Z) 360도 근접 공격. <span class="highlight">100%</span> 대미지.',
        attack: { type: 'full_circle', damageRatio: 1.0, range: 160, cooldown: 30 }
    },
    {
        id: 'holy_sword', tier: 2, category: 'weapon', evolves_to: 'arondight',
        name: '성검', icon: '🗡️',
        desc: '(Z) 360도 근접 공격. <span class="highlight">150%</span> 대미지. 공속 증가.',
        attack: { type: 'full_circle', damageRatio: 3.0, range: 220, cooldown: 22 }
    },
    {
        id: 'arondight', tier: 3, category: 'weapon', evolves_to: 'excalibur',
        name: '아론다이트', icon: '🔱',
        desc: '(Z) 2단 십자가 콤보. <span class="highlight">200%×2</span> 대미지.',
        attack: { type: 'cross_combo', damageRatio: 2.0, range: 240, cooldown: 28 }
    },
    {
        id: 'excalibur', tier: 4, category: 'weapon',
        name: '엑스칼리버', icon: '✨',
        desc: '(Z) 3단 콤보. 1·2단 십자가 후 화면 전체 일직선 베기. <span class="highlight">화면 진동.</span>',
        attack: { type: 'cross_ultimate', damageRatio: 2.5, range: 260, cooldown: 40, slashRatio: 6.0 }
    },

    // ── Tool (자동 사격) ─────────────────────────────────────────────
    {
        id: 'shuriken', tier: 1, category: 'tool', evolves_to: 'bomb_shuriken',
        name: '수리검', icon: '✴️',
        desc: '(자동) 사거리 내 적에게 투사체 자동 발사. <span class="highlight">50%</span> 대미지.',
        attack: { type: 'auto_bullet', damageRatio: 0.5, range: 450, speed: 12, size: 5, cooldown: 50, piercing: true }
    },
    {
        id: 'bomb_shuriken', tier: 2, category: 'tool',
        name: '폭발 수리검', icon: '💥',
        desc: '(자동) 폭발 투사체 자동 발사. <span class="highlight">70%</span> 범위 피해.',
        attack: { type: 'auto_aoe_bullet', damageRatio: 1.4, range: 400, speed: 16, size: 6, aoeRadius: 80, cooldown: 50 }
    },

    // ── Drone (공전 자동 공격) ───────────────────────────────────────
    {
        id: 'illegal_drone', tier: 1, category: 'drone', evolves_to: 'military_drone',
        name: '불법 드론', icon: '🛸',
        desc: '(드론) 플레이어 주변을 공전하며 유도 미사일 자동 발사. <span class="highlight">50%</span> 대미지.<br><span class="highlight">중복 획득 시 드론 1대 증설 (최대 5대).</span>',
        attack: { type: 'drone_missile', damageRatio: 0.5, range: 350, cooldown: 150 }
    },
    {
        id: 'military_drone', tier: 2, category: 'drone',
        name: '군용 드론', icon: '⚙️',
        desc: '(드론) 융단 포격. 사거리 내 복수의 적에게 동시 미사일 발사. <span class="highlight">70%</span> 대미지.<br><span class="highlight">중복 획득 시 드론 1대 증설 (최대 5대).</span>',
        attack: { type: 'drone_carpet', damageRatio: 1.4, range: 600, cooldown: 120, burstCount: 4 }
    },
];
