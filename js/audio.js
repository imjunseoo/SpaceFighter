class AudioManager {
    constructor() {
        this.ctx = null;
        this.bgmNotes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // C 메이저 아르페지오
        this.noteIndex = 0;
        this.bgmInterval = null;
        this.bgmOsc = null;
        this.bgmGain = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if(this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 1. 공격용 8비트 사각파 슬래쉬
    playSwordSlash() {
        this.init();
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'square';
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    // 2. 적 레이저 톱니파 스윕 다운
    playLaser() {
        this.init();
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    // 3. 적 타격음 (사각파)
    playHit() {
        this.init();
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'square';
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // 4. 아이템(젬) 획득음
    playGem() {
        this.init();
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sine';
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1200, now + 0.05);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // 5. 배경음악(스타카토 아르페지오 C Major)
    startBGM() {
        this.init();
        if (this.bgmInterval) return; // 이미 실행중 방지
        this.noteIndex = 0;
        this.playNextNote();
        this.bgmInterval = setInterval(() => this.playNextNote(), 250);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        // 보스 BGM 리소스도 함께 정리
        this.stopBossBGM();
    }

    playNextNote() {
        if(!this.ctx) return;
        const note = this.bgmNotes[this.noteIndex];
        this.noteIndex = (this.noteIndex + 1) % this.bgmNotes.length;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = note;
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        const now = this.ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.015, now + 0.02); // 볼륨을 좀 더 낮췄음(0.015) - 게임 방해 방지
        gainNode.gain.exponentialRampToValueAtTime(0.002, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }

    // 6. 레벨업 팡파레 (상승하는 아케이드 화음)
    playLevelUp() {
        this.init();
        if(!this.ctx) return;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            const start = this.ctx.currentTime + (i * 0.1);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.05, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.005, start + 0.15);
            
            osc.start(start);
            osc.stop(start + 0.15);
        });
    }

    // 7. 보스전 경고 사이렌
    playWarningAlarm() {
        this.init();
        if (!this.ctx) return;
        for (let i = 0; i < 6; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            const start = this.ctx.currentTime + (i * 0.4);
            osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, start);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.08, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.005, start + 0.35);
            osc.start(start);
            osc.stop(start + 0.35);
        }
    }

    // 8. 보스전 전용 BGM (웅장 + 고속 BPM)
    startBossBGM() {
        this.init();
        this.stopBGM(); // 기존 BGM 중지
        if (!this.ctx) return;

        // 레이어 1: 저음 드론 (웅장한 지속 베이스)
        this.bossDrone = this.ctx.createOscillator();
        this.bossDroneGain = this.ctx.createGain();
        this.bossDrone.type = 'sawtooth';
        this.bossDrone.frequency.value = 55; // A1 — 깊은 저음
        this.bossDroneGain.gain.value = 0.04;
        this.bossDrone.connect(this.bossDroneGain);
        this.bossDroneGain.connect(this.ctx.destination);
        this.bossDrone.start();

        // 레이어 2: 옥타브 서브 베이스
        this.bossSubDrone = this.ctx.createOscillator();
        this.bossSubGain = this.ctx.createGain();
        this.bossSubDrone.type = 'square';
        this.bossSubDrone.frequency.value = 27.5; // A0 — 극저음 웅웅거림
        this.bossSubGain.gain.value = 0.02;
        this.bossSubDrone.connect(this.bossSubGain);
        this.bossSubGain.connect(this.ctx.destination);
        this.bossSubDrone.start();

        // 레이어 3: 공격적인 빠른 아르페지오 멜로디
        this.bgmNotes = [
            110.00, 130.81, 164.81, 196.00, 220.00, 261.63, // A2→C5 상승
            246.94, 220.00, 196.00, 164.81, 130.81, 110.00  // 하강
        ];
        this.noteIndex = 0;
        this.bossMelodyInterval = setInterval(() => this.playBossNote(), 140); // ~107 BPM 16분음표
    }

    playBossNote() {
        if (!this.ctx) return;
        const note = this.bgmNotes[this.noteIndex];
        this.noteIndex = (this.noteIndex + 1) % this.bgmNotes.length;

        // 메인 멜로디 (톱니파 — 날카롭고 공격적)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = note;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.003, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.13);

        // 하모닉스 (5도 위에서 함께 울림 — 웅장감)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.value = note * 1.5; // 완전 5도
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.015, now + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.002, now + 0.1);
        osc2.start(now);
        osc2.stop(now + 0.11);
    }

    // 9. 소드마스터 차징 시작 — 에너지 수렴 허밍 (200→800Hz 상승)
    playChargeStart() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.42);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
        osc.start(now);
        osc.stop(now + 0.42);
    }

    // 10. 소드마스터 차징 폭발 해제음 — 저음 충격파 + 고음 슬래시
    playChargeRelease() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // 저음 충격파
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'square';
        osc1.connect(gain1); gain1.connect(this.ctx.destination);
        osc1.frequency.setValueAtTime(130, now);
        osc1.frequency.exponentialRampToValueAtTime(35, now + 0.28);
        gain1.gain.setValueAtTime(0.28, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc1.start(now); osc1.stop(now + 0.28);
        // 고음 슬래시
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.connect(gain2); gain2.connect(this.ctx.destination);
        osc2.frequency.setValueAtTime(1400, now);
        osc2.frequency.exponentialRampToValueAtTime(180, now + 0.18);
        gain2.gain.setValueAtTime(0.18, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc2.start(now); osc2.stop(now + 0.18);
    }

    stopBossBGM() {
        if (this.bossDrone) { try { this.bossDrone.stop(); } catch(e) {} this.bossDrone = null; }
        if (this.bossSubDrone) { try { this.bossSubDrone.stop(); } catch(e) {} this.bossSubDrone = null; }
        if (this.bossMelodyInterval) { clearInterval(this.bossMelodyInterval); this.bossMelodyInterval = null; }
    }

    // 11. 드론 미사일 발사음
    playMissileLaunch() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.connect(gain); gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    }

    // 13. 십자가 대형 참격음 — 중저음 충격 + 날카로운 금속 슬래시 + 잔향
    playCrossSlash() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // 레이어 1: 중저음 충격파 (묵직한 임팩트)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'square';
        osc1.connect(gain1); gain1.connect(this.ctx.destination);
        osc1.frequency.setValueAtTime(180, now);
        osc1.frequency.exponentialRampToValueAtTime(28, now + 0.35);
        gain1.gain.setValueAtTime(0.30, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.start(now); osc1.stop(now + 0.35);
        // 레이어 2: 고음 날카로운 금속 슬래시
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.connect(gain2); gain2.connect(this.ctx.destination);
        osc2.frequency.setValueAtTime(2400, now);
        osc2.frequency.exponentialRampToValueAtTime(280, now + 0.22);
        gain2.gain.setValueAtTime(0.18, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc2.start(now); osc2.stop(now + 0.22);
        // 레이어 3: 잔향 공명 (금속 울림)
        const osc3 = this.ctx.createOscillator();
        const gain3 = this.ctx.createGain();
        osc3.type = 'sine';
        osc3.connect(gain3); gain3.connect(this.ctx.destination);
        osc3.frequency.setValueAtTime(660, now + 0.05);
        osc3.frequency.exponentialRampToValueAtTime(330, now + 0.5);
        gain3.gain.setValueAtTime(0.10, now + 0.05);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc3.start(now + 0.05); osc3.stop(now + 0.5);
    }

    // 12. 드론 미사일 폭발음
    playMissileExplosion() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now); osc.stop(now + 0.22);
    }
}
