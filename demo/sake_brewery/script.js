/* ══════════════════════════════════════════════════════════════════════
   SCRIPT.JS — EMO Sake Brewery
   エモ酒造 公式サイト スクリプト

   目次:
     1. 定数 & グローバル状態
     2. Three.js 液体背景シェーダー
        a. シーン / カメラ / レンダラー
        b. GLSL シェーダー（頂点 + フラグメント）
           - Simplex Noise 2D (Ashima Arts / Stefan Gustavson)
           - Fractal Brownian Motion（5オクターブ）
           - Caustic キラキラ屈折
           - マウスリップル波紋（最大8点）
        c. ユニフォーム定義
        d. マウス / スクロール イベント
        e. アニメーションループ
     3. 2D リップルキャンバス（The Water セクション）
     4. カスタムカーソル
     5. GSAP スクロールアニメーション
        a. MV 入場タイムライン
        b. ブラシ風クリップパスリビール
        c. ボトルカード スタガー
        d. パララックス
     6. Tweaks Panel
   ══════════════════════════════════════════════════════════════════════ */

// 0. 一番最初にこれを書く
window.addEventListener('load', () => {
    console.log("3. ページ内の全リソース（ライブラリ含む）の読み込みが完了しました");

/* ──────────────────────────────────────────────────────────────────────
   1. 定数 & グローバル状態
   ────────────────────────────────────────────────────────────────────── */

// Tweaks Panel から変更されるグローバル値
let waveIntensity = 1.3;

// スクロール量（0–1 に正規化）。Three.js シェーダーと GSAP で共有
let scrollProgress  = 0;
let targetScroll    = 0;

// スクロール速度（派生値：1フレーム前との差分）
let scrollSpeed     = 1.0;
let prevScrollRaw   = 0;

/* ──────────────────────────────────────────────────────────────────────
   2. Three.js 液体背景シェーダー
   ────────────────────────────────────────────────────────────────────── */
(function initLiquidShader() {

  console.log("1. initLiquidShader が開始されました"); // ← 追加

  const canvas = document.getElementById('liquid-canvas');
  if (!canvas) {
    console.warn("Canvasが見つかりません！"); // ← 追加
    return;
  }
  if (typeof THREE === 'undefined') {
    console.warn("Three.js が読み込まれていません！"); // ← 追加
    return;
  }

  console.log("2. 全ての条件をクリア、描画を開始します"); // ← 追加

  /* ── 2a. シーン / カメラ / レンダラー ──────────────────────────────
     OrthographicCamera(-1,1,1,-1) + PlaneGeometry(2,2) で
     フルスクリーンクワッドを生成する Three.js の定石パターン。
     これにより UV は [0,1]×[0,1] で画面全体をカバーする。
  ───────────────────────────────────────────────────────────────────── */
  const scene  = new THREE.Scene();

  // OrthographicCamera(-1,1,1,-1,0,1): 頂点シェーダーで直接 NDC を使うため
  // このカメラ設定自体は実質無効化されているが、Three.js の Mesh 描画には必要。
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // alpha: false → canvas を不透明にする。
  // これにより body/html の背景色がキャンバスの下から透けなくなり、
  // シェーダーの色がそのまま画面に出力される。
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha:     false,
    antialias: false,
  });

  // クリアカラー = シェーダーのベースカラーと同系色（フレーム間の見切れ防止）
  renderer.setClearColor(0xd6eeff, 1);

  // setSize(w, h, true) でキャンバスの style.width/height も更新する。
  // その直後に CSS で 100% に上書きして retina 対応と固定配置を両立させる。
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, true);
  // Three.js が設定した px 値を CSS で上書き（position:fixed の全画面配置を維持）
  canvas.style.width  = '100%';
  canvas.style.height = '100%';

  /* ── 2b. GLSL シェーダー ────────────────────────────────────────── */

  /* ── 頂点シェーダー ────────────────────────────────────────────────
     PlaneGeometry(2,2) の頂点は NDC 座標 (-1,-1)〜(1,1) そのものなので、
     カメラ行列を一切掛けずに position.xy を直接 gl_Position に渡す。
     これにより「どのカメラ設定でも確実に全画面を覆う」最も堅牢な実装になる。
  ───────────────────────────────────────────────────────────────────── */
  const vertexShader = /* glsl */`
    varying vec2 vUv;

    void main() {
      vUv = uv;
      // position.xy は既に NDC (-1 〜 1)。カメラ行列は使わない。
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  /* ── ▼ STEP 1: 赤テスト用フラグメントシェーダー ─────────────────────
     画面全体が赤になれば canvas が正常に動作していると確認できる。
     確認後は STEP 2 のシェーダーに切り替える。
  ───────────────────────────────────────────────────────────────────── */
  const fragmentShaderTest = /* glsl */`
    precision mediump float;
    varying vec2 vUv;

    void main() {
      // UV グラデーションで canvas の全体表示と UV マッピングを同時確認
      // 左下: 黒, 右下: 赤, 左上: 緑, 右上: 黄 → 画面4隅の色で位置を確認できる
      gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);
    }
  `;

  /* ── ▼ STEP 2: 液体シェーダー（本番用）────────────────────────────
     STEP 1 で canvas の表示が確認できたら fragmentShaderTest を
     fragmentShaderLiquid に差し替える（下の ShaderMaterial 定義箇所）。
  ───────────────────────────────────────────────────────────────────── */
  const fragmentShaderLiquid = /* glsl */`
    precision highp float;

    varying vec2 vUv;

    uniform float uTime;           // 経過秒数
    uniform float uScrollProgress; // スクロール量 0–1
    uniform float uScrollSpeed;    // スクロール速度（振幅・速さに乗算）
    uniform float uIntensity;      // waveIntensity（Tweaks 連動）
    uniform vec2  uResolution;     // キャンバス解像度（ピクセル）

    // マウスリップル：最大8点
    // xy = UV 座標、z = 生成からの経過秒（-1.0 = 非アクティブ）
    uniform vec3  uRipples[8];

    /* ───────────────────────────────────────────────────────────────
       Simplex Noise 2D
       出典: Stefan Gustavson / Ashima Arts (MIT License)
       "Simplex noise demystified" (2012)
       https://github.com/ashima/webgl-noise
    ─────────────────────────────────────────────────────────────── */
    vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec3 permute(vec3 x)  { return mod289v3(((x * 34.0) + 10.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4( 0.211324865405187,   // (3.0-sqrt(3.0))/6.0
                           0.366025403784439,    // 0.5*(sqrt(3.0)-1.0)
                          -0.577350269189626,    // -1.0 + 2.0 * C.x
                           0.024390243902439);   // 1.0/41.0
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy  -= i1;
      i = mod289v2(i);
      vec3 p = permute(
        permute(i.y + vec3(0.0, i1.y, 1.0))
              + i.x + vec3(0.0, i1.x, 1.0)
      );
      vec3 m = max(
        0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)),
        0.0
      );
      m = m * m; m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h  = abs(x) - 0.5;
      vec3 a0 = x - floor(x + 0.5);
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    /* ───────────────────────────────────────────────────────────────
       Fractal Brownian Motion（fBm）
       5オクターブのノイズを重ね合わせて有機的な水面ゆらぎを生成。
       各イテレーションで 2.1x スケール + 22.5° 回転を加えることで
       軸方向のアーティファクトを除去する。
    ─────────────────────────────────────────────────────────────── */
    float fbm(vec2 p) {
      float value     = 0.0;
      float amplitude = 0.5;
      // 22.5° 回転行列（繰り返しパターンを防ぐ）
      mat2  rot = mat2(0.924, -0.383, 0.383, 0.924);

      for (int i = 0; i < 5; i++) {
        value     += amplitude * snoise(p);
        p          = rot * p * 2.1;
        amplitude *= 0.5;
      }
      return value;
    }

    /* ───────────────────────────────────────────────────────────────
       Caustic 屈折キラキラ
       2種類の高周波ノイズを合成し、光が水面で屈折した時の
       輝点パターンを近似する。
    ─────────────────────────────────────────────────────────────── */
    float caustic(vec2 p, float t) {
      float c  = snoise(p * 8.0  + t * vec2( 2.1,  1.3));
      c       += snoise(p * 11.0 - t * vec2( 1.4,  2.2)) * 0.6;
      c       += snoise(p * 16.0 + t * vec2(-0.8,  1.7)) * 0.3;
      return pow(max(0.0, 1.0 - abs(c) * 2.2), 5.0);
    }

    void main() {
      vec2  uv  = vUv;
      float asp = uResolution.x / uResolution.y;
      vec2  st  = vec2(uv.x * asp, uv.y); // アスペクト比補正済み座標

      /* ── スクロール変調：マイルド設定 ─────────────────────────────
         係数を小さくし、スクロール時も「優雅なゆらめき」を維持する。
      ─────────────────────────────────────────────────────────── */
      float speedMod = uScrollSpeed * (1.0 + uScrollProgress * 0.45);
      float ampMod   = uIntensity   * (1.0 + uScrollProgress * 0.22);
      float t        = uTime * 0.10 * speedMod;

      /* ── 水面ノイズ（3段 fBm で奥行きを表現）────────────────────
         n1: 表層の細かい揺れ（高周波）
         n2: 中間層（n1 で自己参照し複雑さを加える）
         n3: 深層のゆっくりした大きな変化（低周波）
      ─────────────────────────────────────────────────────────── */
      vec2  q  = st * 1.2;
      float n1 = fbm(q           + t * 0.18);
      float n2 = fbm(q * 1.42    - t * 0.11 + n1 * 0.30);
      float n3 = fbm(q * 0.58    + t * 0.05 + n2 * 0.16);

      float wave = n1 * 0.50 + n2 * 0.33 + n3 * 0.17;
      wave *= ampMod;

      /* ── 屈折オフセット ────────────────────────────────────────── */
      vec2 refractUv = uv + vec2(wave * 0.012, wave * 0.009);

      /* ── Caustic 輝点 ────────────────────────────────────────── */
      float caustVal = caustic(refractUv * vec2(asp, 1.0), t);

      /* ── マウスリップル波紋（多重リング）──────────────────────────
         主リング + 内側リングの2重構造で干渉波を表現する。
         指数減衰により水面に溶け込むような消え方をする。
      ─────────────────────────────────────────────────────────── */
      float rippleAcc = 0.0;
      for (int i = 0; i < 8; i++) {
        float isActive = step(0.0, uRipples[i].z);
        float age    = uRipples[i].z;
        float dist   = length(uv - uRipples[i].xy);
        float radius = age * 0.40;
        // 主リング
        float ring1  = exp(-pow((dist - radius)        * 15.0, 2.0));
        // 内側の干渉リング（振幅0.42倍）
        float ring2  = exp(-pow((dist - radius * 0.62) * 20.0, 2.0)) * 0.42;
        float fade   = exp(-age * 1.5);
        rippleAcc   += (ring1 + ring2) * fade * 0.62 * isActive;
      }

      /* ── カラーパレット（多層水深・透き通る日本酒の清澄感）────────
         深層 n3 で大局的な濃淡を、表層 n1 で局所的な波面感を加える。
      ─────────────────────────────────────────────────────────── */
      vec3 cDeep    = vec3(0.698, 0.843, 0.937); // 深みのある水底色
      vec3 cMid     = vec3(0.816, 0.910, 0.969); // 中間層の透明な水
      vec3 cShallow = vec3(0.906, 0.953, 0.988); // 浅瀬・波面の清澄
      vec3 cFoam    = vec3(0.960, 0.982, 1.000); // 泡・波頭の純白
      vec3 cAzure   = vec3(0.353, 0.706, 0.910); // アクセントブルー
      vec3 cWhite   = vec3(0.990, 0.997, 1.000); // 純白ハイライト

      float wn = n1  * 0.5 + 0.5; // 表層（細かい揺れ）
      float dn = n3  * 0.5 + 0.5; // 深層（大局的な色変化）

      // 深層ベース: 暗い水底 ↔ 明るい中間層
      vec3 base = mix(cDeep, cMid, dn * 0.78);
      // 表層で浅瀬・波面感を加算
      base = mix(base, cShallow, smoothstep(0.42, 0.80, wn) * 0.68);
      // 波頭の白さ（wn が高いほど泡立ち感）
      base = mix(base, cFoam, smoothstep(0.72, 0.97, wn) * 0.48);

      // フレネル様エッジ輝き（波の谷の縁で水深色が光る）
      float fres = pow(1.0 - clamp(wn * 0.80, 0.0, 1.0), 3.0);
      base += cMid * fres * 0.10;

      // Caustic 輝点（アクセントブルー → 白への遷移）
      float caustBright = caustVal * ampMod;
      base = mix(base, cAzure * 1.05, caustBright * 0.38);
      base = mix(base, cWhite,         caustBright * 0.28);

      // マウスリップル（水面に溶け込む白 + アクセント縁取り）
      base  = mix(base, cWhite,  rippleAcc * 0.42);
      base += cAzure * rippleAcc * 0.14;

      // スクロールによる穏やかな明るさ変化
      base += base * uScrollProgress * 0.09;

      gl_FragColor = vec4(clamp(base, 0.0, 1.0), 1.0);
    }
  `; // ← fragmentShaderLiquid ここまで

  /* ── 2c. ユニフォーム ─────────────────────────────────────────────
     uRipples: 8点のリップル情報配列。JS 側で THREE.Vector3 配列として管理。
  ───────────────────────────────────────────────────────────────────── */
  const MAX_RIPPLES = 8;

  // リップルデータ: { x, y, age } × 8。age=-1 で非アクティブ
  const ripplePool = Array.from({ length: MAX_RIPPLES }, () => ({ x: 0, y: 0, age: -1 }));

  // Three.js に渡す Vector3 配列（値を後から更新できる）
  const rippleUniforms = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector3(0, 0, -1));

  const uniforms = {
    uTime:           { value: 0 },
    uScrollProgress: { value: 0 },
    uScrollSpeed:    { value: 1.0 },
    uIntensity:      { value: waveIntensity },
    uResolution:     { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uRipples:        { value: rippleUniforms },
  };

  const geometry = new THREE.PlaneGeometry(2, 2);

  // ── STEP 1（テスト）: fragmentShaderTest で UV グラデーション表示確認
  // ── STEP 2（本番）: fragmentShaderLiquid に切り替え（↓ 現在こちらが有効）
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: fragmentShaderLiquid, // ← 本番: 液体水面シェーダー
    uniforms,
    transparent: false, // alpha:false の不透明レンダラーに合わせて false
    depthTest:   false, // 2D 背景なのでデプスは不要
    depthWrite:  false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; // カメラ内に必ず収まるので culling 不要
  scene.add(mesh);

  /* ── 2d. マウス & スクロール イベント ────────────────────────────── */

  // リップル生成: pool の非アクティブスロットを再利用
  let lastRippleTime = 0;

  document.addEventListener('mousemove', e => {
    const now = performance.now();
    // 60ms ごとに生成（過密防止）
    if (now - lastRippleTime < 60) return;
    lastRippleTime = now;

    const nx = e.clientX / window.innerWidth;
    const ny = 1.0 - e.clientY / window.innerHeight; // UV は Y反転

    // 非アクティブスロットを探す（なければ最古のものを上書き）
    let slot = ripplePool.findIndex(r => r.age < 0);
    if (slot === -1) {
      // 最も age が大きい（古い）スロットを再利用
      slot = ripplePool.reduce((maxI, r, i, arr) =>
        r.age > arr[maxI].age ? i : maxI, 0);
    }

    ripplePool[slot] = { x: nx, y: ny, age: 0 };
  });

  // スクロール量を正規化して targetScroll に記録
  window.addEventListener('scroll', () => {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    targetScroll = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  }, { passive: true });

  // ウィンドウリサイズ: setSize(w, h, true) で drawingBuffer と style を更新後、
  // CSS で width/height を 100% に戻して固定配置を維持する
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, true);
    canvas.style.width  = '100%';
    canvas.style.height = '100%';
    uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  });

  /* ── 2e. アニメーションループ ────────────────────────────────────── */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();   // フレーム間隔（秒）

    // スクロール量をスムーズに補間（lerp）
    scrollProgress += (targetScroll - scrollProgress) * 0.04;

    // スクロール速度：上限 1.35・学習率 0.05 でマイルドに変化
    const rawScrollVel = Math.abs(window.scrollY - prevScrollRaw);
    prevScrollRaw = window.scrollY;
    scrollSpeed += (Math.min(1.35, 1.0 + rawScrollVel * 0.007) - scrollSpeed) * 0.05;

    // リップルの年齢を更新し、寿命を超えたものを非アクティブに
    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (ripplePool[i].age >= 0) {
        ripplePool[i].age += dt;
        // 半径が画面を超えたら（約2秒で）非アクティブ化
        if (ripplePool[i].age > 2.2) ripplePool[i].age = -1;
      }
      // Vector3 ユニフォームを更新
      rippleUniforms[i].set(ripplePool[i].x, ripplePool[i].y, ripplePool[i].age);
    }

    // ユニフォーム更新
    uniforms.uTime.value           = clock.elapsedTime;
    uniforms.uScrollProgress.value = scrollProgress;
    uniforms.uScrollSpeed.value    = scrollSpeed;
    uniforms.uIntensity.value      = waveIntensity;

    renderer.render(scene, camera);
  }

  animate();

})(); // initLiquidShader

/* ──────────────────────────────────────────────────────────────────────
   3. 2D リップルキャンバス（The Water セクション専用）
   マウス移動で金色の波紋が広がる。Three.js とは別の Canvas 2D コンテキスト。
   ────────────────────────────────────────────────────────────────────── */
(function initRippleCanvas() {

  const sec    = document.getElementById('the-water');
  const canvas = document.getElementById('ripple-canvas');
  if (!sec || !canvas) return;

  const ctx = canvas.getContext('2d');
  let ripples = []; // { x, y, r, maxR, alpha, speed, lineWidth, phase }

  function resize() {
    canvas.width  = sec.offsetWidth;
    canvas.height = sec.offsetHeight;
  }
  resize();
  new ResizeObserver(resize).observe(sec);

  // 波紋オブジェクトを生成するヘルパー（phase を追加）
  function makeRipple(x, y, maxR, alpha, speed, lineWidth) {
    return { x, y, r: 0, maxR, alpha, speed, lineWidth,
             phase: Math.random() * Math.PI * 2 };
  }

  // マウス移動で波紋を生成（確率 0.4 でスパースに）
  sec.addEventListener('mousemove', e => {
    if (Math.random() > 0.4) return;
    const rect = sec.getBoundingClientRect();
    ripples.push(makeRipple(
      e.clientX - rect.left,
      e.clientY - rect.top,
      70 + Math.random() * 80,
      0.55,
      1.0 + Math.random() * 1.5,
      0.8 + Math.random() * 0.7,
    ));
  });

  // タッチ対応
  sec.addEventListener('touchmove', e => {
    const rect = sec.getBoundingClientRect();
    const t = e.touches[0];
    ripples.push(makeRipple(
      t.clientX - rect.left, t.clientY - rect.top,
      100, 0.5, 1.8, 1.0,
    ));
  }, { passive: true });

  // アンビエント波紋（静止時でも動きがある）
  let ambientTimer = 0;

  // 有機的な波紋を描く: 中心から放射状にノイズで歪んだ曲線
  function drawOrganicRipple(rp, radiusScale, alphaScale) {
    const r = rp.r * radiusScale;
    const a = rp.alpha * alphaScale;
    if (a < 0.004 || r <= 0) return;

    const SEGS = 32;
    const growRatio = Math.min(1, rp.r / rp.maxR); // 広がるほど歪みが増す
    ctx.beginPath();
    for (let s = 0; s <= SEGS; s++) {
      const angle = (s / SEGS) * Math.PI * 2;
      // 低周波 + 高周波の重ねで有機的な歪みを生成
      const distort = (
        Math.sin(angle * 3 + rp.phase)          * 0.10 +
        Math.sin(angle * 7 - rp.phase * 1.3)    * 0.04 +
        Math.cos(angle * 5 + rp.phase * 0.8)    * 0.03
      ) * growRatio;
      const rr = r * (1 + distort);
      const px = rp.x + Math.cos(angle) * rr;
      const py = rp.y + Math.sin(angle) * rr;
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(90,180,232,${a.toFixed(3)})`;
    ctx.lineWidth   = rp.lineWidth * (0.6 + alphaScale * 0.4);
    ctx.stroke();
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // アンビエント波紋を2秒ごとにランダム配置
    ambientTimer += 16;
    if (ambientTimer > 2000) {
      ambientTimer = 0;
      ripples.push(makeRipple(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        40 + Math.random() * 60,
        0.14, 0.6 + Math.random() * 0.6, 0.5,
      ));
    }

    ripples = ripples.filter(rp => rp.alpha > 0.004);

    for (const rp of ripples) {
      // 主リング
      drawOrganicRipple(rp, 1.00, 1.0);
      // 内側の干渉リング（0.62倍の半径・弱め）
      drawOrganicRipple(rp, 0.62, 0.38);

      rp.r     += rp.speed;
      rp.alpha *= 0.962; // 指数減衰: ゆっくり水面に溶け込む
      if (rp.r >= rp.maxR) rp.alpha = 0;
    }

    requestAnimationFrame(drawFrame);
  }

  requestAnimationFrame(drawFrame);

})(); // initRippleCanvas

/* ──────────────────────────────────────────────────────────────────────
   4. カスタムカーソル
   cursor-dot  : マウス位置を直追従
   cursor-ring : lerp（線形補間）で慣性付き追従
   ────────────────────────────────────────────────────────────────────── */
(function initCursor() {

  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = -100, my = -100; // マウス位置
  let rx = -100, ry = -100; // リング補間位置

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  function tick() {
    // ring は lerp 0.12 で追従（軽い慣性感）
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;

    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';

    requestAnimationFrame(tick);
  }
  tick();

  // インタラクティブ要素でリングを拡大
  document.querySelectorAll('a, button, .bottle-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      ring.style.width   = '52px';
      ring.style.height  = '52px';
      ring.style.opacity = '0.8';
    });
    el.addEventListener('mouseleave', () => {
      ring.style.width   = '32px';
      ring.style.height  = '32px';
      ring.style.opacity = '0.5';
    });
  });

})(); // initCursor

/* ──────────────────────────────────────────────────────────────────────
   5. GSAP スクロールアニメーション
   ────────────────────────────────────────────────────────────────────── */
(function initGSAP() {

  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  /* ── 共通設定 ────────────────────────────────────────────────────── */

  // ブラシリビールのイーズ：冒頭に勢い、末尾でゆっくり止まる墨の質感
  const BRUSH_EASE = 'power4.inOut';
  const BRUSH_DUR  = 1.5;

  /* ── 5a. MV 入場タイムライン ─────────────────────────────────────
     ページ読み込み後、縦書きテキストが上から筆で書かれるように現れる。
     clip-path: inset(0% 0% 100% 0%) → inset(0% 0% 0% 0%) で
     トップ→ボトム展開（縦書きの筆運びを模倣）。
  ───────────────────────────────────────────────────────────────────── */
  const mvTl = gsap.timeline({ delay: 0.4 });

  // 縦書きメインコピー：筆が上から降りてくるイメージ
  mvTl.fromTo('#mv .mv-vertical',
    { clipPath: 'inset(0% 0% 100% 0%)', opacity: 0 },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      opacity:  1,
      duration: BRUSH_DUR,
      ease:     BRUSH_EASE,
    }
  )
  // 英語キャッチコピー：左→右にスワイプ
  .fromTo('#mv .mv-en',
    { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0 },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      opacity:  0.8,
      duration: 1.2,
      ease:     BRUSH_EASE,
    },
    '-=0.6'
  )
  // タグライン：フェードイン
  .to('#mv .mv-tagline',
    { opacity: 0.5, y: 0, duration: 0.9, ease: 'power3.out' },
    '-=0.4'
  )
  // スクロールヒント
  .to('.mv-scroll-hint',
    { opacity: 0.4, duration: 0.8 },
    '-=0.3'
  );

  /* ── 5b. ブラシ風クリップパスリビール（各セクション）────────────
     .reveal クラスを持つ要素をスクロールで検出し、
     テキストタイプに応じてリビール方向を切り替える。
     - 縦書き（.mv-vertical 以外）: inset(0% 0% 100% 0%) → 上から下
     - 横書き: inset(0% 100% 0% 0%) → 左から右
  ───────────────────────────────────────────────────────────────────── */
  gsap.utils.toArray('.reveal').forEach(el => {
    // MV 内は入場 timeline で処理済み
    if (el.closest('#mv')) return;

    const isVertical = getComputedStyle(el).writingMode.includes('vertical');

    // 初期状態を clip-path でセット
    const fromClip = isVertical
      ? 'inset(0% 0% 100% 0%)'   // 縦書き：下からマスク
      : 'inset(0% 100% 0% 0%)';  // 横書き：右からマスク

    gsap.fromTo(el,
      { clipPath: fromClip, opacity: 0, y: isVertical ? 0 : 12 },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        opacity:  1,
        y:        0,
        duration: BRUSH_DUR,
        ease:     BRUSH_EASE,
        scrollTrigger: {
          trigger: el,
          start:   'top 88%',
          once:    true,
        },
      }
    );
  });

  /* ── セクションラベルの横スライン演出 ────────────────────────────
     左のラインが伸びながら金色でフラッシュ
  ───────────────────────────────────────────────────────────────────── */
  gsap.utils.toArray('.section-label').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start:   'top 82%',
      once:    true,
      onEnter: () => gsap.fromTo(el,
        { opacity: 0, x: -24 },
        { opacity: 0.7, x: 0, duration: 1.1, ease: 'power3.out' }
      ),
    });
  });

  /* ── 5c. ボトルカード スタガー ────────────────────────────────────
     3枚が 0.18s 間隔で順番に浮かび上がる。
     各カードは SVG ボトルが下から浮き上がり、
     clip-path で上から降りてくるエフェクトを合わせる。
  ───────────────────────────────────────────────────────────────────── */
  gsap.fromTo('.bottle-card',
    { opacity: 0, y: 60, clipPath: 'inset(0% 0% 30% 0%)' },
    {
      opacity:  1,
      y:        0,
      clipPath: 'inset(0% 0% 0% 0%)',
      stagger: { amount: 0.5, from: 'start' },
      duration: 1.3,
      ease:     'power3.out',
      scrollTrigger: {
        trigger: '.bottle-grid',
        start:   'top 78%',
        once:    true,
      },
      onComplete() {
        document.querySelectorAll('.bottle-card').forEach(c => {
          c.style.clipPath = '';
        });
      },
    }
  );

  // SVG ボトル自体のフロートイン
  gsap.fromTo('.bottle-svg',
    { y: 30, opacity: 0 },
    {
      y:        0,
      opacity:  1,
      stagger:  0.18,
      duration: 1.6,
      ease:     'elastic.out(1, 0.6)',
      scrollTrigger: {
        trigger: '.bottle-grid',
        start:   'top 78%',
        once:    true,
      },
    }
  );

  /* ── 5d. パララックス ────────────────────────────────────────────
     MV 縦書きテキストがスクロールと共に緩やかに上昇（視差効果）
  ───────────────────────────────────────────────────────────────────── */
  gsap.to('.mv-vertical', {
    yPercent:     -18,
    ease:         'none',
    scrollTrigger: {
      trigger: '#mv',
      start:   'top top',
      end:     'bottom top',
      scrub:   1.5, // 1.5秒の追従遅延でなめらかに
    },
  });

  // Process ステップを左右交互にスライドイン
  gsap.utils.toArray('.process-step').forEach((el, i) => {
    gsap.from(el, {
      x:        i % 2 === 0 ? -30 : 30,
      opacity:  0,
      duration: 1.1,
      ease:     'power3.out',
      scrollTrigger: {
        trigger: el,
        start:   'top 85%',
        once:    true,
      },
    });
  });

  // Water 統計数字のカウントアップ
  gsap.utils.toArray('.stat-num').forEach(el => {
    const target = parseFloat(el.textContent);
    const isFloat = el.textContent.includes('.');
    ScrollTrigger.create({
      trigger: el,
      start:   'top 88%',
      once:    true,
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val:      target,
          duration: 1.8,
          ease:     'power2.out',
          onUpdate: function() {
            el.textContent = isFloat
              ? this.targets()[0].val.toFixed(1)
              : Math.round(this.targets()[0].val).toString();
          },
        });
      },
    });
  });

})(); // initGSAP

/* ──────────────────────────────────────────────────────────────────────
   6. Tweaks Panel
   window.postMessage でプレビューモード時に表示され、
   アクセントカラー・波強度・キャンバス透明度・リビール速度を調整できる。
   ────────────────────────────────────────────────────────────────────── */
(function initTweaks() {

  // メッセージによる表示トグル
  window.addEventListener('message', e => {
    const panel = document.getElementById('tweaks-panel');
    if (!panel) return;
    if (e.data?.type === '__activate_edit_mode')   panel.style.display = 'block';
    if (e.data?.type === '__deactivate_edit_mode') panel.style.display = 'none';
  });

  window.parent.postMessage({ type: '__edit_mode_available' }, '*');

  // デフォルト値
  const DEFAULTS = {
    accentColor:   '#5ab4e8',
    waveIntensity: '1.3',
    revealSpeed:   '1.2',
  };

  function applyTweaks(vals) {
    // CSS カスタムプロパティを更新（カーソル・ラベル等に連動）
    document.documentElement.style.setProperty(
      '--accent', vals.accentColor || DEFAULTS.accentColor
    );
    // Three.js シェーダーのユニフォーム（グローバル変数経由）
    waveIntensity = parseFloat(vals.waveIntensity ?? DEFAULTS.waveIntensity);
  }

  applyTweaks(DEFAULTS);

  const panelEl = document.getElementById('tweaks-panel');
  if (!panelEl) return;

  // ★ パネルの表示
  // panelEl.style.display = 'block'; // デバッグ用: ここを有効にすると、編集モードでなくてもパネルが表示される
  panelEl.style.display = 'none'; 
  panelEl.style.zIndex = '9999'; // 他の要素より上に
  console.log("Tweaks Panel を強制表示しました");

  panelEl.querySelector('#tw-accent')?.addEventListener('input', e => {
    applyTweaks({ ...DEFAULTS, accentColor: e.target.value });
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { accentColor: e.target.value } }, '*');
  });

  panelEl.querySelector('#tw-wave')?.addEventListener('input', e => {
    waveIntensity = parseFloat(e.target.value);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { waveIntensity: e.target.value } }, '*');
  });


})(); // initTweaks

/* ──────────────────────────────────────────────────────────────────────
   7. ハンバーガーメニュー（768px 以下）
   GSAP で「ふわっと浮き上がる」オーバーレイを制御する。
   ────────────────────────────────────────────────────────────────────── */
(function initHamburger() {

  if (typeof gsap === 'undefined') return;

  const btn     = document.querySelector('.nav-hamburger');
  const navList = document.querySelector('.nav-links');
  if (!btn || !navList) return;

  const spans = btn.querySelectorAll('span');
  let isOpen  = false;

  // ── 開く ──────────────────────────────────────────────────────────
  function openMenu() {
    isOpen = true;
    btn.setAttribute('aria-expanded', 'true');

    // スクロール抑制: メニュー表示中は背景コンテンツを固定
    document.body.style.overflow = 'hidden';

    // ハンバーガー → ✕ アイコン変形
    gsap.to(spans[0], { rotation: 45,  y:  6.5, duration: 0.4, ease: 'power3.inOut' });
    gsap.to(spans[1], { opacity: 0,            duration: 0.18 });
    gsap.to(spans[2], { rotation: -45, y: -6.5, duration: 0.4, ease: 'power3.inOut' });

    // オーバーレイ: ゆらっとしたフェードイン（scale + y 浮遊）
    gsap.set(navList, { visibility: 'visible', pointerEvents: 'auto' });
    gsap.fromTo(navList,
      { opacity: 0, y: -22, scale: 0.98 },
      { opacity: 1, y: 0,   scale: 1,   duration: 0.60, ease: 'power3.out' }
    );

    // 各メニュー項目: 下から順に浮き上がる stagger 演出
    gsap.fromTo(navList.querySelectorAll('li'),
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.18,
      }
    );
  }

  // ── 閉じる ────────────────────────────────────────────────────────
  function closeMenu() {
    isOpen = false;
    btn.setAttribute('aria-expanded', 'false');

    // ✕ → ハンバーガー アイコン復元
    gsap.to(spans[0], { rotation: 0, y: 0, duration: 0.4, ease: 'power3.inOut' });
    gsap.to(spans[1], { opacity: 1,        duration: 0.3, delay: 0.1 });
    gsap.to(spans[2], { rotation: 0, y: 0, duration: 0.4, ease: 'power3.inOut' });

    // 各メニュー項目を逆順フェードアウト
    gsap.to(navList.querySelectorAll('li'), {
      opacity: 0, y: 12, duration: 0.22,
      stagger: { amount: 0.14, from: 'end' },
      ease: 'power2.in',
    });

    // オーバーレイをフェードアウト → 完了後にスクロール解除
    gsap.to(navList, {
      opacity: 0, y: -14, scale: 0.99, duration: 0.38, delay: 0.16,
      ease: 'power3.in',
      onComplete() {
        gsap.set(navList, { visibility: 'hidden', pointerEvents: 'none', y: 0, scale: 1 });
        gsap.set(navList.querySelectorAll('li'), { opacity: 0, y: 30 });
        // スクロール復元
        document.body.style.overflow = '';
      },
    });
  }

  btn.addEventListener('click', () => isOpen ? closeMenu() : openMenu());

  // リンク押下で自動クローズ
  navList.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => { if (isOpen) closeMenu(); });
  });

  // デスクトップ幅にリサイズした時は強制クローズ + スクロール復元
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && isOpen) {
      isOpen = false;
      btn.setAttribute('aria-expanded', 'false');
      gsap.set(spans, { rotation: 0, y: 0, opacity: 1, clearProps: 'transform,opacity' });
      gsap.set(navList, { visibility: 'hidden', pointerEvents: 'none', opacity: 0, y: 0, scale: 1 });
      gsap.set(navList.querySelectorAll('li'), { opacity: 0, y: 30 });
      document.body.style.overflow = '';
    }
  });

})(); // initHamburger


}); // 0. 一番最後にこれを書く