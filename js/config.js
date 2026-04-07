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
        ATTACK_DAMAGE: 10,
        ATTACK_RANGE: 120,
        MAX_COOLDOWN: 25,
        PICKUP_RANGE: 60,
        MAX_DASH_COOLDOWN: 90
    }
};

const SKILL_POOL = [
    { id: 'cd_down', name: '효율화', desc: '스킬 쿨타임 <span class="highlight">-15%</span>', icon: '⏱️', mostPick: false },
    { id: 'dmg_up', name: '출력 강화', desc: '기본 공격력 <span class="highlight">+5</span> 증가', icon: '⚔️', mostPick: true },
    { id: 'range_up', name: '범위 확장', desc: '공격 범위 <span class="highlight">+25%</span>', icon: '📡', mostPick: false },
    { id: 'hp_up', name: '내구도 강화', desc: '최대 체력 증가 및 <span class="highlight">+30</span> 회복', icon: '❤️', mostPick: true },
    { id: 'speed_up', name: '기동성 증대', desc: '이동 속도 <span class="highlight">+15%</span>', icon: '⚡', mostPick: false },
    { id: 'pickup_up', name: '자력장 강화', desc: '경험치 획득 범위 <span class="highlight">+50%</span>', icon: '🧲', mostPick: false },
    { id: 'dash_cd_down', name: '회피 최적화', desc: '회피기 쿨타임 <span class="highlight">-30%</span>', icon: '💨', mostPick: false },
    { id: 'vampire', name: '흡혈 회로', desc: '적 처치 시 15% 확률로 <span class="highlight">HP 5 회복</span>', icon: '🩸', mostPick: false },
    { id: 'crit_rate', name: '약점 포착', desc: '공격 시 20% 확률로 <span class="highlight">2배 피해</span>', icon: '🎯', mostPick: true }
];

const JOB_POOL = [
    { id: 'job_sword', name: '네온 소드마스터', desc: '공격이 <span class="highlight">3단계 콤보</span>로 변화합니다. 3타는 주변 360도를 타격합니다.', icon: '⚔️', type: 'JOB' },
    { id: 'job_cyber', name: '사이버 오버로드', desc: '주변을 공전하며 대미지를 입히는 <span class="highlight">추적 드론</span>을 가동합니다.', icon: '🛰️', type: 'JOB' }
];
