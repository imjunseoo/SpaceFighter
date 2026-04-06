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
}
