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
        MAX_DASH_COOLDOWN: 90
    }
};

// 어빌리티 카드 풀 - 4등급 (Bronze / Silver / Gold / Prism)
const SKILL_POOL = [
    // ── Bronze ──────────────────────────────────────────────
    { id: 'output_module',   name: '출력 모듈',    desc: '공격력 <span class="highlight">+5</span> 증가.',                                          icon: '⚡', grade: 'bronze' },
    { id: 'lens_expand',     name: '렌즈 확장',    desc: '공격 범위 <span class="highlight">+15%</span> 증가.',                                      icon: '📡', grade: 'bronze' },
    { id: 'coolant_pump',    name: '냉각수 펌프',  desc: '무기 쿨타임 <span class="highlight">-10%</span>.',                                         icon: '❄️', grade: 'bronze' },
    { id: 'endurance_up',    name: '지속력 증가',  desc: '최대 체력 및 현재 체력 <span class="highlight">+100</span> 증가.',                          icon: '❤️', grade: 'bronze' },

    // ── Silver ──────────────────────────────────────────────
    { id: 'vampire_circuit', name: '흡혈회로',     desc: '적 처치 시 <span class="highlight">5% 확률</span>로 HP 3 회복. (중복 시 확률 합산)',        icon: '🩸', grade: 'silver' },
    { id: 'surge_cathode',   name: '서지 캐소드',  desc: '대시 후 2초간 다음 공격이 무조건 크리티컬. <span class="highlight">중첩당 크리 피해 +10</span>.', icon: '⚡', grade: 'silver' },

    // ── Gold ────────────────────────────────────────────────
    { id: 'chain_lightning', name: '연쇄 번개',    desc: '크리티컬 적중 시 3마리에게 번개 방출. <span class="highlight">데미지: 10 × 스택</span>.', icon: '🌩️', grade: 'gold' },
    { id: 'crit_logic',      name: '치명로직',     desc: '치명타 확률 <span class="highlight">+10%</span> 증가.',                                    icon: '🎯', grade: 'silver' },
    { id: 'crit_research',   name: '치명로직 연구', desc: '치명타 피해 계수 <span class="highlight">+5%</span> 증가.',                                icon: '🔬', grade: 'gold' },

    // ── Prism ────────────────────────────────────────────────
    { id: 'binding_king',    name: '명명백백한 속박의 왕', desc: '받는 피해 <span class="highlight">×2</span>. 대신 현재 공격력의 <span class="highlight">2배</span>를 추가로 획득.', icon: '👑', grade: 'prism', unique: true },
    { id: 'reversal',        name: '반전술식',     desc: '획득 즉시 HP와 공격력 수치를 <span class="highlight">서로 맞바꿈</span>.',                 icon: '🔀', grade: 'prism', unique: true },
    { id: 'berserk',         name: '프로토콜: 버서커', desc: '체력 30% 이하 시 공격 속도 <span class="highlight">+50%</span> 폭증.',                 icon: '😡', grade: 'prism', unique: true },
    { id: 'blackhole',       name: '특이점(블랙홀) 생성', desc: '공격 시 <span class="highlight">1% 확률</span>로 3초간 소형 블랙홀 생성.',            icon: '🕳️', grade: 'prism', unique: true },
    { id: 'recovery',        name: '리커버리',     desc: '사망 시 HP 100% 회복 및 주변 적 파괴. <span class="highlight">단 1회</span>.',             icon: '💊', grade: 'prism', unique: true },
];

const JOB_POOL = [
    // ── 1차 직업 (Lv.5) ─────────────────────────────────────────
    { id: 'install_sword',  name: '인스톨 : 소드맨',   desc: '공격이 <span class="highlight">3단계 콤보</span>로 변화합니다. 3타는 주변 360도를 타격합니다. <span class="highlight">(공격 속도 소폭 하향)</span>',                         icon: '⚔️',  type: 'JOB', tier: 1, grade: 'gold'  },
    { id: 'install_gunner', name: '인스톨 : 거너',     desc: '맵 전역 <span class="highlight">자동 조준 사격</span>으로 변경됩니다. 획득 즉시 공격 속도 버프 적용.',                                                                    icon: '🔫',  type: 'JOB', tier: 1, grade: 'gold'  },
    { id: 'install_mecha',  name: '인스톨 : 메카닉',   desc: '<span class="highlight">강화 드론 2기</span>를 소환합니다. 각 드론은 공격력의 <span class="highlight">50%</span> 데미지를 가집니다.',                                          icon: '🤖',  type: 'JOB', tier: 1, grade: 'gold'  },

    // ── 2차 전직 (보스 처치) ─────────────────────────────────────
    { id: 'master_sword',   name: '소드마스터',        desc: '3타 차징 시 잠시 멈추며 <span class="highlight">광범위 대미지 폭발</span>을 시전합니다.',                                                                                  icon: '🗡️',  type: 'JOB', tier: 2, grade: 'prism', requires: 'install_sword'  },
    { id: 'master_gunner',  name: '데스페라도',        desc: '자동 조준 <span class="highlight">연사 속도 극대화</span> 및 탄환 크기/피해 증가.',                                                                                        icon: '🎯',  type: 'JOB', tier: 2, grade: 'prism', requires: 'install_gunner' },
    { id: 'master_mecha',   name: '오버로드',          desc: '드론 <span class="highlight">6기 증설</span>. 플레이어 주변 360도 방사형 사격. 공격력의 <span class="highlight">100%</span> 데미지.',                                       icon: '⚙️',  type: 'JOB', tier: 2, grade: 'prism', requires: 'install_mecha'  },
];
