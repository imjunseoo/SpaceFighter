/**
 * Firebase 초기화 및 유저 DB 관리
 * 
 * [설정 방법]
 * 1. https://console.firebase.google.com 에서 프로젝트를 생성합니다
 * 2. 웹 앱을 추가하고 아래 firebaseConfig 객체의 값을 교체합니다
 * 3. Authentication > Sign-in method 에서 Google 로그인을 활성화합니다
 * 4. Firestore Database를 생성합니다 (테스트 모드 권장)
 * 5. Authentication > Settings > 승인된 도메인에 'localhost'를 추가합니다
 */

class FirebaseDB {
    constructor() {
        // ===================================================
        // ⚠ 아래 값을 Firebase Console에서 복사한 값으로 교체하세요!
        // Firebase Console > 프로젝트 설정 > 일반 > 내 앱 > Firebase SDK snippet
        // ===================================================
        this.firebaseConfig = {
            apiKey: "AIzaSyB3XS5nyMPXq7UnkV9Ila_gpdbGxkvDrFM",
            authDomain: "space-fighter-84942.firebaseapp.com",
            projectId: "space-fighter-84942",
            storageBucket: "space-fighter-84942.firebasestorage.app",
            messagingSenderId: "1053174816144",
            appId: "1:1053174816144:web:de1e00af67bbf04d6a2715"
        };

        this.app = null;
        this.auth = null;
        this.db = null;
        this.user = null;
        this.initialized = false;
    }

    /**
     * Firebase 초기화 (SDK 로드 후 호출)
     */
    init() {
        try {
            if (typeof firebase === 'undefined') {
                console.warn('[FirebaseDB] Firebase SDK가 로드되지 않았습니다. 오프라인 모드로 작동합니다.');
                return false;
            }
            if (this.firebaseConfig.apiKey === 'YOUR_API_KEY') {
                console.warn('[FirebaseDB] Firebase Config가 설정되지 않았습니다. firebase-config.js의 firebaseConfig를 수정하세요.');
                return false;
            }

            this.app = firebase.initializeApp(this.firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.initialized = true;

            // 인증 상태 감지   
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                this.onAuthChanged(user);
            });

            console.log('[FirebaseDB] 초기화 성공');
            return true;
        } catch (e) {
            console.error('[FirebaseDB] 초기화 실패:', e);
            return false;
        }
    }

    /**
     * 인증 상태 변경 콜백 (Game에서 오버라이드)
     */
    onAuthChanged(user) {
        // Game 클래스에서 이 함수를 교체하여 UI 업데이트
        console.log('[FirebaseDB] Auth 상태:', user ? user.displayName : '로그아웃');
    }

    /**
     * Google 로그인
     */
    async loginWithGoogle() {
        if (!this.initialized) { console.warn('[FirebaseDB] 미초기화 상태'); return null; }
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await this.auth.signInWithPopup(provider);
            this.user = result.user;

            // users 컬렉션에 유저 문서 업데이트/생성
            await this.db.collection('users').doc(this.user.uid).set({
                displayName: this.user.displayName,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            return this.user;
        } catch (e) {
            console.error('[FirebaseDB] 로그인 실패:', e);
            return null;
        }
    }

    /**
     * 로그아웃
     */
    async logout() {
        if (!this.initialized) return;
        try {
            await this.auth.signOut();
            this.user = null;
        } catch (e) {
            console.error('[FirebaseDB] 로그아웃 실패:', e);
        }
    }

    /**
     * 최고 기록 갱신 (킬 수 / 생존 시간)
     * @param {number} score - 킬 수
     * @param {number} surviveTime - 생존 시간 (초)
     * @returns {boolean} 갱신 여부
     */
    async updateHighScore(score, surviveTime) {
        if (!this.initialized || !this.user) return false;
        try {
            const docRef = this.db.collection('leaderboard').doc(this.user.uid);
            const doc = await docRef.get();

            if (!doc.exists || doc.data().highScore < score) {
                await docRef.set({
                    uid: this.user.uid,
                    displayName: this.user.displayName,
                    highScore: score,
                    surviveTime: surviveTime,
                    date: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('[FirebaseDB] 최고 기록 갱신:', score);
                return true;
            }
            return false;
        } catch (e) {
            console.error('[FirebaseDB] 기록 저장 실패:', e);
            return false;
        }
    }

    /**
     * 업적 추가 (중복 방지)
     * @param {string} achievementId - 업적 ID (예: 'BOSS_SLAYER')
     */
    async updateAchievement(achievementId) {
        if (!this.initialized || !this.user) return;
        try {
            await this.db.collection('users').doc(this.user.uid).update({
                achievements: firebase.firestore.FieldValue.arrayUnion(achievementId)
            });
            console.log('[FirebaseDB] 업적 달성:', achievementId);
        } catch (e) {
            console.error('[FirebaseDB] 업적 저장 실패:', e);
        }
    }

    /**
     * 유저 데이터 조회
     * @returns {Object|null} 유저 문서 데이터
     */
    async getUserData() {
        if (!this.initialized || !this.user) return null;
        try {
            const doc = await this.db.collection('users').doc(this.user.uid).get();
            return doc.exists ? doc.data() : null;
        } catch (e) {
            console.error('[FirebaseDB] 유저 데이터 조회 실패:', e);
            return null;
        }
    }

    /**
     * 리더보드 상위 10명 조회
     * @returns {Array} 상위 기록 배열
     */
    async getLeaderboard() {
        if (!this.initialized) return [];
        try {
            const snapshot = await this.db.collection('leaderboard')
                .orderBy('highScore', 'desc')
                .limit(10)
                .get();
            return snapshot.docs.map(doc => doc.data());
        } catch (e) {
            console.error('[FirebaseDB] 리더보드 조회 실패:', e);
            return [];
        }
    }
}

// 전역 인스턴스
const firebaseDB = new FirebaseDB();
