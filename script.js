// ==============================================
// script.js — 初期化を一箇所にまとめた完全版
// ==============================================

// ★★★ 追加: ブラウザの標準スクロール復元を無効化（GSAPで制御するため） ★★★
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// GSAPプラグインの登録（安全な書き方）
if (typeof gsap !== 'undefined') {
  // プラグインオブジェクトが存在するかチェックしてから登録
  const plugins = [];
  if (typeof ScrollTrigger !== 'undefined') plugins.push(ScrollTrigger);
  if (typeof ScrollToPlugin !== 'undefined') plugins.push(ScrollToPlugin);
  
  if (plugins.length > 0) {
    gsap.registerPlugin(...plugins);
  }
}

// ============================
// 共通ヘルパー / 色定義 / テクスチャ
// ============================
// ユーザーにて色変更
const colorPurple = new THREE.Color(0xecc3ff);
const colorWhite = new THREE.Color(0xffffff);
const colorPaleGreen = new THREE.Color(0x69EACB);
const colorPaleBlue = new THREE.Color(0x6654F1);

const COLOR_CYCLE_DURATION = 3000;
const TOTAL_SEQUENCE_LENGTH = 6;
const TOTAL_CYCLE_DURATION = COLOR_CYCLE_DURATION * TOTAL_SEQUENCE_LENGTH;
const colorSequenceA = [colorWhite, colorPaleGreen, colorWhite, colorPurple, colorWhite, colorPaleBlue, colorWhite];
const colorSequenceB = [colorPurple, colorWhite, colorPaleBlue, colorWhite, colorPaleGreen, colorWhite, colorPurple];

// ユーザーにて色変更
const STAR_COLORS = [
  new THREE.Color(0x69EACB),
  new THREE.Color(0xecc3ff),
  new THREE.Color(0x6654F1)
];

function createSphereTexture() {
  // 1. サイズを大きくして、スマホの高解像度でも粒々が見えないようにする
  const size = 1024; 
  const cnv = document.createElement('canvas');
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext('2d');
  const center = size / 2;
  const radius = size / 2;

  // 2. キャンバスをクリア
  ctx.clearRect(0, 0, size, size);

  // 3. グラデーションの作成（中心から外側へ）
  // 粒々感を消すため、中心を強くしすぎず、外側へ滑らかにフェードさせる
  const g = ctx.createRadialGradient(center, center, 0, center, center, radius);
  
  // 中心：白（不透明度100%）
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  
  // 中間：少し緩やかに落とす（ここが急だと粒々に見える）
  g.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  g.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  
  // 外側：完全に透明
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = g;
  
  // 4. 円を描画
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();

  // テクスチャを作成して返す
  const texture = new THREE.CanvasTexture(cnv);
  
  // 重要：テクスチャがぼやけるのを防ぐフィルタリング設定（滑らかさ優先）
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  return texture;
}
const sphereTexture = createSphereTexture();

// ============================
// 🐀. マウスストーカー用 状態変数（グローバルに移動） 🐀
// ============================
let stalkerInstance = null; // Stalker DOM要素を保持
let stalkerTargetX = 0;
let stalkerTargetY = 0;
let stalkerCurrentX = 0;
let stalkerCurrentY = 0;
const STALKER_EASING = 0.2; 

// ============================
// 💫. キラキラパーティクル用 状態変数と設定 💫
// ============================
const SPARKLE_COLORS = [
    '#d272ff', 
    '#a8ff9c', 
    '#a8d2ff'  
];
const CREATE_INTERVAL_MIN = 100;
const CREATE_INTERVAL_MAX = 300;
const PARTICLE_LIFETIME_MIN = 3000;
const PARTICLE_LIFETIME_MAX = 6000;
const MOUSE_STOP_DELAY = 150; 

let sparkleContainer = null;
let lastSparkleTime = 0;
let currentMouseX = 0;
let currentMouseY = 0;
let mouseMoveTimer = null;
let isMouseMoving = false;


// =================================================================
// 💫. キラキラパーティクルを生成する関数 (グローバルに移動)
// =================================================================
function createSparkle() {
    if (!isMouseMoving || !sparkleContainer) {
        return;
    }

    const now = performance.now();
    const interval = Math.random() * (CREATE_INTERVAL_MAX - CREATE_INTERVAL_MIN) + CREATE_INTERVAL_MIN;
    if (now - lastSparkleTime < interval) { 
         return;
    }
    lastSparkleTime = now;

    const sparkle = document.createElement('div');
    sparkle.classList.add('sparkle');
    sparkleContainer.appendChild(sparkle);

    sparkle.style.left = `${currentMouseX}px`;
    sparkle.style.top = `${currentMouseY}px`;

    const fallDistance = Math.random() * 100 + 150;
    const rotateEnd = Math.random() * 720 - 360;
    const initialScale = Math.random() * 0.7 + 0.7;
    const particleDuration = Math.random() * (PARTICLE_LIFETIME_MAX - PARTICLE_LIFETIME_MIN) + PARTICLE_LIFETIME_MIN;
    
    const randomColor = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
    sparkle.style.setProperty('--sparkle-color', randomColor);

    sparkle.style.opacity = '0';
    sparkle.style.transform = `translate(-50%, -50%) scale(${initialScale}) rotate(${Math.random() * 360}deg)`;

    gsap.fromTo(sparkle,
        {
            opacity: 0.8,
            scale: initialScale,
            rotation: Math.random() * 360 
        },
        {
            y: `+=${fallDistance}`, 
            opacity: 0,
            scale: 0.2, 
            rotation: rotateEnd,
            duration: particleDuration / 1000,
            ease: "none",
            onComplete: () => {
                sparkle.remove();
            }
        }
    );
}
// ... 既存の他の関数（shuffleArray, getRandomImagePathなど）が続く ...



// ============================
// 粒子システム共通の定数
// ============================
const ORIGINAL_PARTICLE_COUNT = 1000;
const STAR_PARTICLE_COUNT = 300; // TOPシステムで使用
const CONTACT_STAR_COUNT = STAR_PARTICLE_COUNT / 2; // 150: CONTACTシステムで使用
const TOTAL_PARTICLE_COUNT = ORIGINAL_PARTICLE_COUNT + STAR_PARTICLE_COUNT;
const tmpColor = new THREE.Color();


// ============================
// 1) TOP システム (球体パーティクル + 流星)
// ============================

let canvasTop = null; 
let rendererTop = null;
let sceneTop = null;
let cameraTop = null;

let particlesTop = null;
let geometryTop = null;
let starVelocitiesTop = null; 
let isAboutSectionActive = false;

let startTimeTop = Date.now();


function initTopParticles() {
  // TOPシステムは流星粒子を含む
  geometryTop = new THREE.BufferGeometry();
  const positions = new Float32Array(TOTAL_PARTICLE_COUNT * 3);
  const colors = new Float32Array(TOTAL_PARTICLE_COUNT * 3);
  starVelocitiesTop = new Float32Array(STAR_PARTICLE_COUNT * 3); 

  // 既存粒子
  for (let i = 0; i < ORIGINAL_PARTICLE_COUNT; i++) {
    const radius = Math.random() * 8;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.random() * Math.PI;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    const i3 = i * 3;
    positions[i3] = x; positions[i3 + 1] = y; positions[i3 + 2] = z;

    const c = i % 2 === 0 ? colorPurple : colorWhite;
    colors[i3] = c.r; colors[i3 + 1] = c.g; colors[i3 + 2] = c.b;
  }

  geometryTop.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometryTop.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: 0.12, // 必要に応じて調整
    map: sphereTexture,
    vertexColors: true,
    
    // ★ 光を重ねて発光させる設定（加算合成）
    blending: THREE.AdditiveBlending,
    
    // ★ 透明部分を有効にする
    transparent: true,
    opacity: 0.9,
    
    // ★ 粒々対策：ここ重要 ★
    // alphaTest は削除してください（消える原因になります）
    // depthWrite: false にすることで、粒子の前後関係による四角い枠のチラつきを消します
    depthWrite: false, 
  });

  particlesTop = new THREE.Points(geometryTop, material);
  sceneTop.add(particlesTop);
}

function updateTopParticleColors() {
  const elapsedTime = (Date.now() - startTimeTop) % TOTAL_CYCLE_DURATION;
  const phaseIndex = Math.floor(elapsedTime / COLOR_CYCLE_DURATION);
  const phaseTime = elapsedTime % COLOR_CYCLE_DURATION;
  const t = phaseTime / COLOR_CYCLE_DURATION;
  const colorsAttr = geometryTop.attributes.color;

  for (let i = 0; i < ORIGINAL_PARTICLE_COUNT; i++) {
    const seq = i % 2 === 0 ? colorSequenceA : colorSequenceB;
    const start = seq[phaseIndex];
    const end = seq[phaseIndex + 1];
    tmpColor.copy(start).lerp(end, t);

    colorsAttr.array[i * 3] = tmpColor.r;
    colorsAttr.array[i * 3 + 1] = tmpColor.g;
    colorsAttr.array[i * 3 + 2] = tmpColor.b;
  }
  colorsAttr.needsUpdate = true;
}

function updateTopMeteorAnimation() {
  const pos = geometryTop.attributes.position.array;

  if (isAboutSectionActive) {
    for (let i = 0; i < STAR_PARTICLE_COUNT; i++) {
      const starIndex = ORIGINAL_PARTICLE_COUNT + i;
      const i3 = starIndex * 3;
      const v3 = i * 3;

      pos[i3] += starVelocitiesTop[v3] * 0.5; 
      pos[i3 + 1] += starVelocitiesTop[v3 + 1] * 0.5;

      const x = pos[i3], y = pos[i3 + 1];
      if (x < -10 || y < -10) {
        pos[i3] = 5 + Math.random() * 5;
        pos[i3 + 1] = 5 + Math.random() * 5;
        pos[i3 + 2] = Math.random() * 2 - 1;
      }
    }
  } else {
    for (let i = 0; i < STAR_PARTICLE_COUNT; i++) {
      const i3 = (ORIGINAL_PARTICLE_COUNT + i) * 3;
      pos[i3] = 20 + Math.random() * 5;
      pos[i3 + 1] = 20 + Math.random() * 5;
      pos[i3 + 2] = -50 + Math.random() * 10;
    }
  }
  geometryTop.attributes.position.needsUpdate = true;
}

/**
 * TOPセクションのアニメーションループ (RAFループ)
 * Three.jsのレンダリング、パーティクルの動き、およびカスタムカーソルの追従を処理
 */
function animateTop() {
    
    // 🚨 1. Three.jsのレンダリングとパーティクル更新
    if (rendererTop && sceneTop && cameraTop) {
        // TOPパーティクルの更新処理
        // エラーが出ていた updateParticles の代わりに、お客様の既存の関数を呼び出します
        if (typeof updateTopParticleColors === 'function') {
            updateTopParticleColors();
        }
        if (typeof updateTopMeteorAnimation === 'function') {
            updateTopMeteorAnimation();
        }

        // Three.jsの回転処理
        if (particlesTop) {
            particlesTop.rotation.x += 0.0001;
            particlesTop.rotation.y += 0.0002;
            particlesTop.rotation.z += 0.0003;
        }

        // Three.jsのレンダリング
        if (!document.hidden) {
             rendererTop.render(sceneTop, cameraTop);
        }
    }
    
    // 🚨 2. カスタムカーソルとキラキラの追従/生成 (復活)
    // initMouseStalkerで定義されたグローバル変数を使用
    if (typeof stalkerInstance !== 'undefined' && stalkerInstance !== null) {
        // 追従処理 (イージング計算)
        stalkerCurrentX += (stalkerTargetX - stalkerCurrentX) * STALKER_EASING;
        stalkerCurrentY += (stalkerTargetY - stalkerCurrentY) * STALKER_EASING;
        // DOM要素の更新
        stalkerInstance.style.transform = `translate(${stalkerCurrentX}px, ${stalkerCurrentY}px) translate(-50%, -50%)`;
    }
    
    // キラキラの生成
    if (typeof createSparkle === 'function') {
        createSparkle();
    }

    // 🚨 3. 再帰呼び出し（継続）
    requestAnimationFrame(animateTop);
}


// ============================
// 2) CONTACT システム (流星パーティクルのみ - 調整済み)
// ============================
let canvasContact = null;
let rendererContact = null;
let sceneContact = null;
let cameraContact = null;

let particlesContact = null;
let geometryContact = null;
let starVelocitiesContact = null; // 流星速度を格納

function initContactParticles() {
  const CONTACT_COUNT = CONTACT_STAR_COUNT; // 150個
  
  geometryContact = new THREE.BufferGeometry();
  const positions = new Float32Array(CONTACT_COUNT * 3); 
  const colors = new Float32Array(CONTACT_COUNT * 3);    
  starVelocitiesContact = new Float32Array(CONTACT_COUNT * 3); 

  // 流星粒子 (CONTACT_COUNT分のみを生成)
  for (let i = 0; i < CONTACT_COUNT; i++) {
    const i3 = i * 3;
    const v3 = i * 3;

    // 1. 下から上へ流れるように初期位置を設定（左下付近）
    const startX = -10 + Math.random() * 10;
    const startY = -10 + Math.random() * 10; 
    const startZ = Math.random() * 2 - 1; 

    positions[i3] = startX;
    positions[i3 + 1] = startY;
    positions[i3 + 2] = startZ;

    // ★ 修正箇所 1: 速度設定を低速化 (0.05〜0.2の範囲に) ★
    starVelocitiesContact[v3] = 0.05 + Math.random() * 0.15; 
    starVelocitiesContact[v3 + 1] = 0.05 + Math.random() * 0.15; 
    starVelocitiesContact[v3 + 2] = 0;

    const col = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
    colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b;
  }

  geometryContact.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometryContact.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
    size: 0.24, // 必要に応じて調整
    map: sphereTexture,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.7, 
    
    // ★ ここも同様に設定
    depthWrite: false
  });

  particlesContact = new THREE.Points(geometryContact, material);
  sceneContact.add(particlesContact);
}

function updateContactMeteorAnimation() {
  const pos = geometryContact.attributes.position.array;
  const CONTACT_COUNT = CONTACT_STAR_COUNT; 
  
  // 流星パーティクルのみをアニメーションさせる
  for (let i = 0; i < CONTACT_COUNT; i++) {
    const i3 = i * 3;
    const v3 = i * 3; 

    // ★ 修正箇所 2: フレームごとの移動量を大幅に削減 (0.5 -> 0.1) ★
    pos[i3] += starVelocitiesContact[v3] * 0.1;
    pos[i3 + 1] += starVelocitiesContact[v3 + 1] * 0.1;

    const x = pos[i3], y = pos[i3 + 1];
    
    // 3. 消えないように（画面外に出たら反対側から再出現）
    // 上に抜けたら下に戻す
    if (y > 10) {
        pos[i3 + 1] = -10;
    }
    
    // 右に抜けたら左に戻す
    if (x > 10) {
        pos[i3] = -10;
    }
  }
  
  geometryContact.attributes.position.needsUpdate = true;
}

function animateContact() {
  function loop() {
    requestAnimationFrame(loop);
    if (!geometryContact) return;

    updateContactMeteorAnimation(); // 流星アニメーション実行

    if (particlesContact) {
      // 流星群全体の回転（維持）
      particlesContact.rotation.x += 0.0001;
      particlesContact.rotation.y += 0.0002;
      particlesContact.rotation.z += 0.0003;
    }
    rendererContact.render(sceneContact, cameraContact);
  }
  loop();
}




// ============================================================
// 2. hero部分アニメーション(関数化)
//    ローディング完了後にこの関数が呼び出されます。
// ============================================================
function startHeroAnimation() { // ★関数名を startHeroAnimation に変更しました
    // 要素が存在するかチェックしてから実行
    if (!document.querySelector('.hero')) return;

    gsap.fromTo(".hero h1 > span:not(.emotion)", 
      { opacity: 0, filter: "blur(3px)", y: 20 },
      { 
        opacity: 1, 
        filter: "blur(0px)", 
        y: 0,
        duration: 1.5, 
        ease: "power2.out",
        stagger: 0.1, 
        onComplete: () => {
        // 2. ★ タイピングアニメーションの開始 ★
          gsap.to(".emotion .char", {
            opacity: 1,
            duration: 0.1, 
            stagger: 0.1, 
            ease: "none",
            onComplete: () => {
            // カメラアニメーションもここで安全に実行
            // 3. 全テキスト出現後、スクロールアニメーションを開始
            
              // cameraTop が定義されているか確認してから実行
              if (typeof cameraTop !== 'undefined' && cameraTop) {
                  gsap.to(cameraTop.position, {
                    z: 12, 
                    ease: "power2.out",
                    scrollTrigger: {
                      trigger: "body",
                      start: "top top",
                      end: "10%", 
                      scrub: true,
                    }
                  });
              }
                // H1消滅アニメーション (既存のロジック)
              gsap.to(".hero h1", {
                scale: 0.1, 
                filter: "blur(10px)", 
                opacity: 0, 
                ease: "power1.out",
                scrollTrigger: {
                  trigger: "body",
                  start: "top top",
                  end: "10%", 
                  scrub: true,
                  toggleActions: "play reverse play reverse",
                }
              });
            }
          });
        }
      }
    );
}

// =============================================================
// 3. Projectsセクション - ピン留めとビルボードスライダー(関数化)
// =============================================================

    // ============================
    // 共通ヘルパー関数：配列シャッフル (Fisher-Yatesアルゴリズム)
    // ============================
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // 要素を交換
        }
        return array;
    }

function initProjectsSection() {
    // 0.📌 pin留め 📌
    const projectsSection = document.querySelector('.projects-section');
    const PROJECTS_PIN_SCROLL = 3000; 

    // ★★★ 修正箇所 ★★★
    // カルーセルフィギュア要素を取得
    const carouselFigures = gsap.utils.toArray('.carousel-figure'); 

    // ちらつき対策：全フィギュアに translate3d を適用してGPU描画を強制する
    gsap.set(carouselFigures, {
        x: 0, 
        y: 0, 
        z: 0, // Z軸を0に設定
        // または transform: 'translate3d(0, 0, 0)' でも可
    });
    // ★★★ ここまで ★★★

    // ProjectsセクションのPin留めと出現アニメーション (修正)
    ScrollTrigger.create({
        trigger: projectsSection, 
        pin: true, 
        start: "top top", 
        end: `+=${PROJECTS_PIN_SCROLL}`, 
        
        // onEnterとonLeaveでPinが開始/解除された時の処理をシンプルにする
        onEnter: () => {
            gsap.to(projectsSection, { 
                opacity: 1, 
                duration: 0.5,
                onComplete: () => {
                    projectsSection.style.pointerEvents = 'auto';
                    if (typeof render === 'function') requestAnimationFrame(render);
                }
            });
        },
        onLeave: () => {
            // Pin解除時に非表示にする
            gsap.to(projectsSection, { opacity: 0, duration: 0.5, onComplete: () => {
                projectsSection.style.pointerEvents = 'none'; // マウスイベントを無効化
            }});
        },
        onEnterBack: () => {
            gsap.to(projectsSection, { 
                opacity: 1, 
                duration: 0.5,
                onStart: () => {
                    projectsSection.style.pointerEvents = 'auto';
                    if (typeof render === 'function') requestAnimationFrame(render);
                }
            });
        },
        onLeaveBack: () => {
            // Pinが解除され、Projectsセクションが画面上に戻ったら非表示
            gsap.to(projectsSection, { 
                opacity: 0, 
                duration: 0.5,
                onComplete: () => {
                    projectsSection.style.pointerEvents = 'none'; // マウスイベントを無効化
                }
            });
        }
    });

    // 1.🛠️ 設定: 画像パターンと枚数の定義 🛠️
    // 💡画像の数を変えたらここの数も変える👇
    // const を let に変更
    let CAROUSEL_ITEMS = [
        { name: 'UIUX', folder: 'uiux', filePrefix: 'uiux', totalImages: 7, description: 'UI/UX' },
        { name: 'CODE', folder: 'coding', filePrefix: 'code', totalImages: 8, description: 'CODE' },
        { name: 'GRAPHIC', folder: 'graphic', filePrefix: 'graphic', totalImages: 7, description: 'GRAPHIC' },
        { name: 'FLYER', folder: 'flyer', filePrefix: 'flyer', totalImages: 5, description: 'FLYER' },
        { name: 'LOGO', folder: 'logo', filePrefix: 'logo', totalImages: 6, description: 'LOGO' }
    ];
    const IMAGE_EXTENSION = '.webp'; 
    const ANGLE_STEP = 360 / CAROUSEL_ITEMS.length; // 72度

    // DOM要素の取得
    const container = document.querySelector('.carousel__container');
    const figures = container.querySelectorAll('.carousel-figure'); 
    const total = figures.length; 

    // 状態変数
    let angle = 0; // 現在の全体回転角 (未使用だが残存しているため、そのまま維持)
    let isDragging = false;
    let startX = 0;
    let autoRotate = true;

    // 🚨 修正: 遠近法の半径を 300 に設定 🚨
    const radius = 300; 

    // 🚨 新規: オートプレイ制御用の変数 🚨
    let lastAutoRotateTime = 0; // 最後に自動回転が実行された時間
    const AUTO_ROTATE_INTERVAL = 3000; // 3000ms (3秒) ごとに回転

    // 🚨 新規: アニメーションの目標角度 🚨
    let targetAngle = 0; 
    let currentAngle = 0; // 以前の `angle` 変数と同じ役割を担いますが、より制御しやすいように名前を変更


    // 2.🖼️ 関数: 画像パスと初期設定 🖼️

    /**
     * 指定されたアイテム情報に基づき、ランダムな画像パスを生成します。
     */
    function getRandomImagePath(item) {
        const randomIndex = Math.floor(Math.random() * item.totalImages) + 1;
        // ★修正: フォルダ名を 'images' から 'img' に変更★
        return `img/${item.folder}/${item.filePrefix}${randomIndex}${IMAGE_EXTENSION}`;
    }

    /**
     * ページ読み込み時に、各 figure 要素にランダムな画像を割り当てます。
     */
    function setInitialImages() {
        figures.forEach((figure, index) => {
            if (CAROUSEL_ITEMS[index]) {
                const item = CAROUSEL_ITEMS[index];
                const imagePath = getRandomImagePath(item);
                
                const imgElement = figure.querySelector('img');
                const captionElement = figure.querySelector('figcaption');
                
                // 画像パスを設定
                if (imgElement) {
                    imgElement.src = imagePath;
                    imgElement.alt = item.name + ' - ' + item.description;
                }
                // キャプションを設定
                if (captionElement) {
                    captionElement.textContent = item.description;
                }
                
                // 各 figure の初期角度を保存
                figure.dataset.angle = (ANGLE_STEP * index).toString(); 
            }
        });
    }


    /* ビルボードカルーセルのコンテンツをシャッフルし、表示を更新します。
     */
    function shuffleCarousel() {
        // 1. 自動回転と操作を一時停止
        autoRotate = false;
        
        // 2. CAROUSEL_ITEMS配列をシャッフル
        shuffleArray(CAROUSEL_ITEMS);
        
        // エフェクトの基本設定
        const EFFECT_DURATION = 0.6; // 回転アニメーションの秒数
        const EFFECT_STAGGER = 0.05; // 各アイテムの開始時間のズラし
        const totalEffectTime = EFFECT_DURATION + (figures.length - 1) * EFFECT_STAGGER; // 全てのアニメーションが完了する時間
        
    // 3. シャッフルされた新しい順序で figure 要素の内容を更新
        figures.forEach((figure, index) => {
            const item = CAROUSEL_ITEMS[index];
            const imagePath = getRandomImagePath(item);
            
            const imgElement = figure.querySelector('img');
            const captionElement = figure.querySelector('figcaption');
            
            // **コンテンツの更新**（エフェクト開始前に行う）
            if (imgElement) {
                imgElement.src = imagePath;
                imgElement.alt = item.name + ' - ' + item.description;
            }
            if (captionElement) {
                captionElement.textContent = item.description;
            }

            // ★★★ エフェクトの追加 ★★★
            // imgElementをターゲットにし、360度回転とスケールをアニメーション
            gsap.fromTo(imgElement, 
                { 
                    rotationY: 0, 
                    scale: 0.7,
                    z: 2, // ★重要: アニメーション開始時も Z=2px (手前) を維持
                    force3D: true // ★重要: 3Dレンダリングを強制
                }, 
                { 
                    rotationY: 360, 
                    scale: 1.0,     
                    z: 2, // ★重要: 回転中・終了時も Z=2px を維持して、背景と重ならないようにする
                    duration: EFFECT_DURATION,
                    delay: index * EFFECT_STAGGER, 
                    ease: "back.out(1.7)",
                    
                    // チラつき防止のおまじない
                    onStart: () => {
                        // アニメーション中は裏面を隠す
                        imgElement.style.backfaceVisibility = 'hidden';
                        imgElement.style.webkitBackfaceVisibility = 'hidden';
                    }
                }
            );
            
            // figureの角度情報は変更しない (figure要素の位置は固定されているため)
            // figure.dataset.angle = (ANGLE_STEP * index).toString(); // 不要
        });
        
        // 4. 回転をリセットし、特定のfigureを正面に持ってくる
        const snappedAngle = Math.round(targetAngle / ANGLE_STEP) * ANGLE_STEP;
        targetAngle = snappedAngle;
        
        // 5. アニメーション完了後に自動回転を再開
        gsap.to(projectsSection, { 
            duration: 0.1, // 短い時間で処理を挟む
            delay: totalEffectTime, // 全てのアイテムのアニメーションが終わるまで待つ
            onComplete: () => {
                autoRotate = true; // 回転再開
            }
        });
        
        console.log("Carousel content shuffled with effect.");
    }



    // 3.🔄 関数: アニメーションループ (回転ロジック) 🔄

    function render(timestamp) {
        // 1. 自動回転ロジックの修正
        if (autoRotate && !isDragging) {
            if (timestamp - lastAutoRotateTime > AUTO_ROTATE_INTERVAL) {
                // 🚨 3秒経過したら、次のスライドの角度（72度）を目標に設定 🚨
                targetAngle -= ANGLE_STEP; 
                lastAutoRotateTime = timestamp;
            }
        }
        
        // 2. 目標角度に向けて現在の角度を滑らかに補間
        // (補間関数を使用して、スムーズに回転させる)
        const easing = 0.01; // 回転の滑らかさ (数値が小さいほどゆっくり)
        currentAngle += (targetAngle - currentAngle) * easing;

        // 3. 各 figure 要素の transform を更新
        figures.forEach((figure) => {
            const figureAngle = parseFloat(figure.dataset.angle);
            // currentAngle を使用
            const totalAngle = figureAngle + currentAngle; 
            
            figure.style.transform = `
                translate(-50%, -50%) 
                rotateY(${totalAngle}deg)
                translateZ(${radius}px)
                rotateY(${-totalAngle}deg)
            `;
        });

        requestAnimationFrame(render);
    }


    // 4.🖱️ イベント: マウス/タッチ操作 🖱️

    const shuffleButton = document.getElementById('shuffle-button');

    if (shuffleButton) {
        shuffleButton.addEventListener('click', shuffleCarousel);
    }

    // マウスドラッグで操作
    container.parentElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        container.parentElement.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        container.parentElement.style.cursor = 'grab';

        // ★追加: ドラッグ終了時のスナップ処理★
        if (autoRotate) {
            // 現在の角度に最も近い、ANGLE_STEPの倍数を計算
            // targetAngleを基準に最も近い72度の倍数を計算
            const snappedAngle = Math.round(targetAngle / ANGLE_STEP) * ANGLE_STEP;
            
            // GSAPのSetter/Getter機能を使用し、targetAngleをアニメーション
            gsap.to({ a: targetAngle }, {
                a: snappedAngle,
                duration: 0.5,
                ease: "power2.out",
                onUpdate: function() {
                    targetAngle = this.targets()[0].a;
                },
                onStart: () => autoRotate = false,
                onComplete: () => autoRotate = true,
            });
            
        }
    });

    // タッチ操作（スマホ対応）
    container.parentElement.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX;
    });

    // タッチ操作にも同様の処理が必要です
    container.parentElement.addEventListener('touchend', () => {
        isDragging = false;

        // ★追加: タッチ操作終了時のスナップ処理★
        if (autoRotate) {
            const snappedAngle = Math.round(targetAngle / ANGLE_STEP) * ANGLE_STEP;
            
            gsap.to({ a: targetAngle }, {
                a: snappedAngle,
                duration: 0.5,
                ease: "power2.out",
                onUpdate: function() {
                    targetAngle = this.targets()[0].a;
                },
                onStart: () => autoRotate = false,
                onComplete: () => autoRotate = true,
            });
        }
    });

    container.parentElement.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const delta = e.touches[0].clientX - startX;
        startX = e.touches[0].clientX;
        
        // 🚨 修正: タッチ操作も targetAngle に影響を与える 🚨
        targetAngle += delta * 0.3; // 感度
    });

    // ホバーで自動回転停止
    container.parentElement.addEventListener('mouseenter', () => autoRotate = false);
    container.parentElement.addEventListener('mouseleave', () => autoRotate = true);



    figures.forEach((figure, index) => {
        // figure要素自体にクリックイベントを付与
        figure.addEventListener('click', () => {
            // 現在 figure に割り当てられているアイテム情報を取得
            const item = CAROUSEL_ITEMS[index];
            
            if (item && item.folder) {
                // folder名をID名に合わせて変換 (例: uiux -> uiux-section)
                const sectionId = `${item.folder}-section`;
                
                // ポートフォリオページに移動し、該当セクションへジャンプ
                window.location.href = `portfolio.html#${sectionId}`;
            }
        });

        // カーソルをポインターに変更し、クリック可能であることを示す
        figure.style.cursor = 'pointer';
    });

    
    //5. 🚀 起動処理 🚀

    // 1. 画像の初期設定
    setInitialImages();
    // 2. アニメーションループ開始
    // 🚨 render() の引数に timestamp が渡されるようにする 🚨
    requestAnimationFrame(render);

}       

// =================================================================
// 4. PARALLAXセクションのアニメーション (バブルの動き + セクションのワイプアウト)　(関数化)
// =================================================================

function initParallaxSection() {

    const parallaxSection = document.querySelector('.parallax');
    const bgFadeLayer = document.querySelector('.bg-fade-layer'); 
    const canvasContainer = document.querySelector('.canvas-container'); 

    const TOTAL_BUBBLE_COUNT = 30; // バブルの総数
    const BUBBLE_IMAGE_PATHS = [
        'img/bubble/fluid-blob1.png', 'img/bubble/fluid-blob2.png', 'img/bubble/fluid-blob3.png',
        'img/bubble/fluid-blob4.png', 'img/bubble/fluid-blob5.png', 'img/bubble/fluid-blob6.png',
        'img/bubble/fluid-blob7.png', 'img/bubble/fluid-blob8.png', 'img/bubble/fluid-blob9.png',
        'img/bubble/fluid-blob10.png', 'img/bubble/fluid-blob11.png', 'img/bubble/fluid-blob12.png',
        'img/bubble/fluid-blob13.png',
    ];

    // バブルのパララックス終了位置は、セクション全体のワイプアウトと同時期にする
    const ANIMATION_END_SCROLL = "bottom-=100 top"; 
    // セクション全体のワイプアウト期間 (100vh)
    const WIPE_OUT_DURATION_VH = 100;

    if (parallaxSection) {
        
        // 💡 1. バブル要素を生成し、初期設定とアニメーションを適用 (既存ロジックを維持)
        for (let i = 0; i < TOTAL_BUBBLE_COUNT; i++) {
            
            // ... (バブル生成ロジックは変更なし) ...
            const bubble = document.createElement('img');
            bubble.src = BUBBLE_IMAGE_PATHS[i % BUBBLE_IMAGE_PATHS.length];
            bubble.alt = "bubble";
            bubble.loading = "lazy";
            parallaxSection.appendChild(bubble); 

            // サイズの分布を極端に小さい方に偏らせる
            const skewedRandom = Math.random()**3; 
            const scaleValue = 0.1 + skewedRandom * 0.7; 
            const speedFactor = 1 + scaleValue * 3; 

            // ★★★ 修正箇所: SP（画面幅768px以下）のサイズ調整ロジック ★★★
            // SPのサイズ係数を決定
            let mobileScaleFactor = 1;
            if (window.innerWidth < 768) {
                // SPの場合、2.5倍に拡大 (この値でSPのサイズ感を調整できます)
                mobileScaleFactor = 2.5; 
            }
            
            // 最終的なスケール値は、元の値にSP倍率を掛けたもの
            const finalScale = scaleValue * mobileScaleFactor;
            // ★★★ 修正箇所 ここまで ★★★

            // 初期設定
            gsap.set(bubble, {
                position: 'absolute',
                width: '100vw', 
                scale: finalScale, // ★修正: finalScale を使用
                xPercent: -50, 
                x: (Math.random() * 140 - 20) + 'vw', 
                y: (Math.random() * 50) + 100 + 'vh', 
                rotation: Math.random() * 360,
            });

            // 💡 2. バブルのパララックスアニメーション (既存ロジックを維持)
            const baseRange = 500; 
            const parallaxRange = baseRange * speedFactor; 
            const baseHorizontalRange = 4000;
            const parallaxX = (Math.random() - 0.5) * baseHorizontalRange * speedFactor * 0.5;
            const rotationSpeed = (Math.random() - 0.5) * 500; 

            gsap.to(bubble, {
                scrollTrigger: {
                    trigger: parallaxSection,
                    start: "top bottom",
                    // バブルのパララックスはワイプアウト完了時に終了する
                    end: `top top+=${WIPE_OUT_DURATION_VH}vh`, // 100vhで終了
                    scrub: 1,
                },
                y: -parallaxRange, 
                x: parallaxX,
                rotation: rotationSpeed,
                ease: "none",
                delay: i * (1 / TOTAL_BUBBLE_COUNT) * 0.5, 
            });
        }

        // ★★★ 3. セクション全体のワイプアウトアニメーション (追加) ★★★
        // .parallaxセクション全体を100vhスクロールする間に画面外に押し出す
        gsap.to(parallaxSection, {
            y: "-100vh", // 画面の高さ分だけ上に移動 (ワイプアウト)
            ease: "none", 
            scrollTrigger: {
                trigger: parallaxSection,
                start: "top top", // .parallaxのトップが画面トップに来たとき
                end: `top top+=${WIPE_OUT_DURATION_VH}vh`, // 100vhスクロールする間にアニメーション完了
                scrub: true,
                // .parallaxセクションを固定し、下にある.reasonセクションが
                // ワイプアウト完了まで画面に現れないように制御します。
                pin: true, 
                // markers: true, // 確認用
            }
        });


        // ★★★ 4. 背景色と粒子のフェードを制御 (既存ロジックの調整) ★★★
        const fadeTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: parallaxSection,
                start: "top bottom",
                // ★修正: 終了をセクションワイプアウトと同期させる（100vh地点）
                end: `top top+=${WIPE_OUT_DURATION_VH}vh`,        
                scrub: 1,
            }
        });

        fadeTimeline
            // A. 背景色切り替えの処理 (黒 -> 白: opacity 0 -> 1)
            .to(bgFadeLayer, { opacity: 1, duration: 1 }, 0) 
            
            // B. canvas背景の粒子パーティクルをフェードアウト (1 -> 0)
            .to(canvasContainer, { opacity: 0, duration: 1 }, 0) 
            
            // C. bodyの文字色を白から黒へ切り替える処理
            .to('body', { color: '#000', duration: 1 }, 0)
            
            // D. アニメーション完了時にbg-fade-layerを完全に非表示にする (不要なためコメントアウト)
            // .set(bgFadeLayer, { display: 'none' }, 1);
            
    } else {
        console.warn("パララックスセクションが見つかりません。HTMLを確認してください。");
    }

}

// =================================================================
// 5. REASONセクションのアニメーション (Pin機能使用、中央固定のみ)
// =================================================================
function initReasonSection() {
    const reasonSection = document.querySelector('.reason');
    const reasonText = document.querySelector('.reason div'); 
    const windowHeight = window.innerHeight;

    const NEW_START_OFFSET_VH = 90;   
    const NEW_START_OFFSET_PX = windowHeight * (NEW_START_OFFSET_VH / 100); 

    if (reasonSection && reasonText) {
        
        function CenteringProps() {
            return {
                position: 'fixed', 
                margin: 0,        
                top: '50%',
                left: '50%',
                xPercent: -50, 
                yPercent: -50
            };
        }

        const isDirectAccess = window.location.hash === '#reason';

        if (isDirectAccess) {
            // A. 直接アクセス時: Pinを無効にし、静的に表示する
            
            // 1. 静的表示設定
            gsap.set(reasonText, { 
                opacity: 1, 
                y: 0, 
                visibility: "visible",
                position: 'static', // Pinを無効化
                transform: 'none',   // 座標変換をクリア
            });
            
            // 2. ★★★ 修正: マーカーアニメーション (is-animatedクラス) を強制的に付与 ★★★
            // Pinアニメーションが実行されないため、CSSアニメーションをトリガーするクラスを強制的に追加します。
            reasonText.classList.add('is-animated');
            // ★★★ 修正 ここまで ★★★

        } else {
            // B. 通常アクセス時: Pinアニメーションのために初期状態を隠しておく
            gsap.set(reasonText, { 
                opacity: 0, 
                y: 30, 
                visibility: "hidden" 
            });

            // 1. Pinとマーカーアニメーションの制御 (通常アクセス時のみ)
            ScrollTrigger.create({
                trigger: reasonSection, 
                start: `top top+=${NEW_START_OFFSET_PX}px`, 
                end: 'bottom top', 
                pin: reasonText,   
                
                // toggleClassはPinが動いているときに発火
                toggleClass: {targets: reasonText, className: "is-animated"},
                toggleActions: "play none none reverse", 
                // ... (onEnter/onLeave ロジックは省略または変更なし) ...
                onEnter: () => {
                    gsap.set(reasonText, CenteringProps());
                    gsap.to(reasonText, { opacity: 1, y: 0, visibility: "visible", duration: 0.5, ease: "power2.out", overwrite: true });
                },
                onEnterBack: () => {
                    gsap.set(reasonText, CenteringProps());
                    gsap.to(reasonText, { opacity: 1, y: 0, visibility: "visible", duration: 0.5, overwrite: true });
                },
                onLeave: () => {
                    gsap.set(reasonText, { clearProps: 'all' });
                },
                onLeaveBack: () => {
                    gsap.set(reasonText, { clearProps: 'all' });
                    gsap.set(reasonText, { opacity: 0, y: 30, visibility: "hidden" });
                }
            });

            // リバース時のブレ対策 (通常アクセス時のみ)
            gsap.to(reasonText, {
                scrollTrigger: {
                    trigger: reasonSection,
                    start: `top top+=${NEW_START_OFFSET_PX}px`, 
                    end: 'bottom top', 
                    scrub: true,
                    onUpdate: (self) => {
                        if (self.isActive) {
                            const props = CenteringProps();
                            gsap.set(reasonText, {
                                position: props.position,
                                top: props.top,
                                left: props.left,
                                xPercent: props.xPercent,
                                yPercent: props.yPercent,
                                margin: props.margin
                            });
                        }
                    }
                }
            });
        }
        
        ScrollTrigger.refresh();
    }
}


// =================================================================
// 6. HOWTOセクション (最終修正版: インジケーター外部化対応)
// =================================================================
function initHowtoSection() {
    const howtoSection = document.querySelector('.howto');
    
    // ★修正: 外に出したインジケーターを取得
    // もし見つからなければ、念のためセクション内も探す（HTML修正漏れ対策）
    const indicatorWrapper = document.querySelector('.howto-indicator-wrapper');

    if (!howtoSection) return;

    const howtoRoutes = gsap.utils.toArray('.howto-route');
    const indicators = gsap.utils.toArray('.pankuzu .index');

    if (howtoRoutes.length > 0) {
        const TOTAL_ITEMS = howtoRoutes.length; 
        const PIN_DURATION_PER_ITEM = 1500; 
        const TRANSITION_RATIO = 0.33; 

        const transitionDuration = PIN_DURATION_PER_ITEM * TRANSITION_RATIO; 
        const holdDuration = PIN_DURATION_PER_ITEM * (1 - TRANSITION_RATIO); 

        function updateIndicator(activeIndex) {
            indicators.forEach((indicator, index) => {
                indicator.classList.remove('is-active', 'is-highlighted');
                if (index <= activeIndex) {
                    indicator.classList.add('is-active');
                }
                if (index < activeIndex) {
                     indicator.classList.add('is-highlighted');
                }
            });
        }

        // 初期配置
        gsap.set(howtoRoutes[0], { xPercent: 0, yPercent: 0 }); 
        gsap.set(howtoRoutes.slice(1), { xPercent: 100, yPercent: 0 });  

        const mainTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: howtoSection,
                pin: true,           
                start: "top top",
                end: `+=${PIN_DURATION_PER_ITEM * TOTAL_ITEMS}`, 
                scrub: true,         
                pinSpacing: true,
                
                // ★★★ 追加: インジケーターの表示・非表示制御 ★★★
                onEnter: () => {
                    if(indicatorWrapper) indicatorWrapper.classList.add('is-visible');
                },
                onEnterBack: () => {
                    if(indicatorWrapper) indicatorWrapper.classList.add('is-visible');
                    
                    // 既存の処理（Route 7のテキスト表示）
                    const route7 = howtoRoutes[TOTAL_ITEMS - 1];
                    if (route7) {
                        route7.classList.add('is-animated');
                        const pWrap = route7.querySelector('.p-wrap');
                        if (pWrap) gsap.to(pWrap, { opacity: 1, duration: 0.1, delay: 0.5 });
                    }
                },
                onLeave: () => {
                    if(indicatorWrapper) indicatorWrapper.classList.remove('is-visible');
                    // 既存の処理
                    howtoRoutes.forEach(el => el.classList.remove('is-animated')); 
                },
                onLeaveBack: () => {
                    if(indicatorWrapper) indicatorWrapper.classList.remove('is-visible');
                },
                // ★★★ ここまで ★★★

                onUpdate: (self) => {
                    const progress = self.progress;
                    const currentIndex = Math.min(
                        Math.floor(progress * TOTAL_ITEMS),
                        TOTAL_ITEMS - 1
                    );
                    updateIndicator(currentIndex);
                },
            }
        }); 

        // アニメーション構築 (変更なし)
        mainTimeline.add(() => {
            const currentRoute = howtoRoutes[0];
            currentRoute.classList.add('is-animated');
            const pWrap = currentRoute.querySelector('.p-wrap');
            if (pWrap) gsap.to(pWrap, { opacity: 1, duration: 0.1, delay: 0.5 });
        }, 0.01);

        mainTimeline.to({}, { duration: PIN_DURATION_PER_ITEM, ease: "none" });

        for (let i = 1; i < TOTAL_ITEMS; i++) { 
            const currentRoute = howtoRoutes[i];
            const prevRoute = howtoRoutes[i - 1];
            
            mainTimeline.to(currentRoute, { 
                xPercent: 0, 
                ease: "power2.out", 
                duration: transitionDuration,
                onStart: () => {
                    prevRoute.classList.remove('is-animated'); 
                    currentRoute.classList.add('is-animated'); 
                    const pWrap = currentRoute.querySelector('.p-wrap');
                    if (pWrap) gsap.to(pWrap, { opacity: 1, duration: 0.1, delay: 0.5 });
                },
                onReverseComplete: () => {
                     prevRoute.classList.add('is-animated'); 
                     currentRoute.classList.remove('is-animated');
                }
            }, `+=0`); 
            
            mainTimeline.to(currentRoute, { 
                xPercent: 0, 
                ease: "none", 
                duration: holdDuration 
            });
        }
    }
}

// =================================================================
// 7. ABOUTセクション - アニメーション (背景滲みエフェクトの修正)
// =================================================================

function initAboutSection() {
    const aboutSection = document.querySelector('.about');
    // 要素がなければ終了
    if (!aboutSection) return;

    const aboutProcessH2 = document.querySelector('.about-process h2');
    const aboutTop = document.querySelector('.about_top'); 

    // --- SVGフィルターアニメーション ---
    const inkFilter = document.querySelector('#ink-bleed feTurbulence'); 
    const dispMap = document.querySelector('#ink-bleed feDisplacementMap'); 

    if (aboutTop && inkFilter && dispMap) {
        ScrollTrigger.create({
            trigger: aboutTop,
            start: "top bottom-=15%", 
            once: true,
            onEnter: () => {
                aboutTop.classList.add('is-bg-active'); 
                const bgTl = gsap.timeline();
                bgTl.to([inkFilter, dispMap], {
                    duration: 1.5, 
                    attr: { baseFrequency: "0.15 0.35", scale: 1000 },
                    ease: "power2.in",
                }, 0) 
                .to([inkFilter, dispMap], {
                    duration: 2.0,
                    attr: { baseFrequency: "0 0", scale: 0 }, 
                    ease: "power2.out",     
                }, 0.5); 
            }
        });
    }

    // --- コンテンツフェードイン ---
    const contentItems = gsap.utils.toArray([
        '.about-content',     
        '.about-thanks h2',
        '.about-thanks p'   
    ]);

    contentItems.forEach((item, index) => {
        gsap.from(item, {
            scrollTrigger: {
                trigger: aboutTop, 
                start: "top bottom-=15%", 
                once: true,             
            },
            duration: 1.5,
            opacity: 0,
            y: 20, 
            ease: "power2.out",
            delay: 1.0 + (index * 0.2) 
        });
    });

    // --- マーカー出現アニメーション ---
    if (aboutProcessH2) {
        ScrollTrigger.create({
            trigger: aboutProcessH2,
            start: "top center+=10%", 
            onEnter: () => { aboutProcessH2.classList.add('is-animated'); },
            once: true, 
        });
    }

    // --- プロセス要素アニメーション ---
    const processItems = gsap.utils.toArray('.about-process dl div');
    processItems.forEach((item, index) => {
        gsap.from(item, {
            scrollTrigger: {
                trigger: item,
                start: "top bottom-=10%", 
                once: true,             
            },
            x: 50,                  
            opacity: 0,            
            duration: 1.2,          
            ease: "power2.out",     
            delay: index * 0.2,     
        });
    });
}

// =================================================================
// 🌗 テーマ切り替え (ABOUT -> CONTACT 背景色変更)
// =================================================================
// ★ここに独立させる
function controlThemeChange() {
    const aboutSection = document.querySelector('.about'); 
    const contactSection = document.querySelector('.contact');
    const process3Item = document.querySelector('.about-process .process3');

    if (process3Item && aboutSection && contactSection) {
        ScrollTrigger.create({
            trigger: process3Item,
            // process3が画面中央付近に入った瞬間 (bottom + 100px) に発火させる
            start: "top center+=100px", 
            
            onEnter: () => {
                // ABOUTセクションにクラスを付与
                aboutSection.classList.add('is-dark-theme');
                // CONTACTセクションにクラスを付与
                contactSection.classList.add('is-dark-theme');
                console.log("Theme Change: Switched to Dark Theme.");
            },
            onLeaveBack: () => {
                // ABOUTセクションのクラスを削除
                aboutSection.classList.remove('is-dark-theme');
                // CONTACTセクションのクラスを削除
                contactSection.classList.remove('is-dark-theme');
                console.log("Theme Change: Switched back to Light Theme.");
            }
        });
    }
}


// ============================
// CONTACT の ScrollTrigger 制御
// ============================
function controlContactParticlesVisibility() {
  const contactSection = document.querySelector('.contact');
  const canvasContact = document.querySelector('.canvas-contact');

  if (!contactSection || !particlesContact || !canvasContact) return;

  if (ScrollTrigger.getAll().some(s => s.trigger === contactSection)) return;

  // CONTACTセクションが見える範囲でキャンバスをフェードイン/アウト
  ScrollTrigger.create({
    trigger: contactSection,
    start: "top center", 
    end: "bottom top",   
    
    onEnter: () => {
      // CONTACTセクションに入ったら表示
      gsap.to(canvasContact, { opacity: 1, duration: 1.2, ease: 'power2.out' });
      // TOPの粒子と重なってしまうため、TOP粒子を非表示にする
      gsap.to(canvasTop, { opacity: 0, duration: 0.8 });
    },
    onLeave: () => {
      // セクションを抜けたら非表示にし、TOP粒子を再表示
      gsap.to(canvasContact, { opacity: 0, duration: 1.0, ease: 'power2.out' });
      gsap.to(canvasTop, { opacity: 1, duration: 1.0 });
    },
    onEnterBack: () => {
      // スクロールアップで戻ってきたら表示し、TOP粒子を非表示
      gsap.to(canvasContact, { opacity: 1, duration: 1.2, ease: 'power2.out' });
      gsap.to(canvasTop, { opacity: 0, duration: 0.8 });
    },
    onLeaveBack: () => {
      // スクロールアップでセクションを抜けたら非表示にし、TOP粒子を再表示
      gsap.to(canvasContact, { opacity: 0, duration: 1.0, ease: 'power2.out' });
      gsap.to(canvasTop, { opacity: 1, duration: 1.0 });
    }
  });

  // Contact h2 のフェードイン（既存ロジック）
  const h2 = contactSection.querySelector('h2');
  if (h2) {
    gsap.from(h2, {
      scrollTrigger: {
        trigger: contactSection,
        start: "top center",
        once: true
      },
      y: 50,
      opacity: 0,
      duration: 1.5,
      ease: "power2.out",
      delay: 1.0
    });
  }
}

// =================================================================
// 9. スクロール安定化処理 (モバイル環境向け - 安全版)
// =================================================================
function stabilizeScrollTrigger() {
    if (typeof ScrollTrigger === 'undefined') return;

    // 🚨 危険な ScrollTrigger.normalizeScroll(true) は使用しません 🚨
    
    // 1. 初期化時のレイアウト計算の最終確定
    // Adobe Fontsや画像の読み込み遅延による計算ミスを防ぐため、長めの遅延を設けます。
    setTimeout(() => {
        // trueを付けて、Pinインスタンスの開始/終了位置も再計算させる
        ScrollTrigger.refresh(true); 
    }, 800); 

    // 2. ★★★ モバイルのvh変動対策として、リサイズ時のリフレッシュを強化 ★★★
    let resizeTimer;
    window.addEventListener('resize', () => {
         // リサイズ中はリフレッシュを遅延させ、連続実行を防ぐ
         clearTimeout(resizeTimer);
         resizeTimer = setTimeout(() => {
             // ScrollTriggerを再計算させ、Pinなどの位置ズレを修正
             ScrollTrigger.refresh(true); 
         }, 300); // 300ms待ってから実行
    });
    
    // 3. (オプション) 初期の refresh はすぐに実行しておく
    ScrollTrigger.refresh();
}

// ============================
// リサイズ処理（両 canvas を1箇所で処理）
// ============================
/**
 * ウィンドウサイズ変更時に各種要素やThree.jsのキャンバスサイズを更新します。
 */
function onWindowResize() {
    // 🚨 Three.jsが不要なページでは実行を即時終了 🚨
    if (document.body.classList.contains('portfolio-page')) {
        return; 
    }
    
    // 以下、index.html専用のリサイズ処理を継続
    const width = window.innerWidth;
    const height = window.innerHeight;

    // DOM要素の存在チェックを強化し、null参照エラーを回避
    const topCanvas = document.getElementById('top-canvas');
    const contactCanvas = document.getElementById('contact-canvas');

    if (topCanvas) {
        // TOPセクションのリサイズ処理 (TOP 粒子に依存)
        if (typeof topCamera !== 'undefined' && topCamera) {
            topCamera.aspect = width / height;
            topCamera.updateProjectionMatrix();
            topRenderer.setSize(width, height);
        }
    }
    
    if (contactCanvas) {
        // CONTACTセクションのリサイズ処理 (CONTACT 粒子に依存)
        if (typeof contactCamera !== 'undefined' && contactCamera) {
            contactCamera.aspect = width / height;
            contactCamera.updateProjectionMatrix();
            contactRenderer.setSize(width, height);
        }
    }
}



// =================================================================
// 🐀. マウスストーカー (カスタムカーソル) の初期化と実行
// =================================================================
function initMouseStalker() {
    // 🚨 portfolio.html では即時終了 🚨
    if (document.body.classList.contains('portfolio-page')) {
        return; 
    }
    // 1. DOM要素をグローバル変数に格納
    stalkerInstance = document.getElementById('stalker');
    if (!stalkerInstance) {
        console.warn("カスタムカーソル要素 (#stalker) が見つかりません。");
        return;
    }
    
    // 2. マウスの移動をグローバル変数に記録
    function onMouseMove(e) {
        stalkerTargetX = e.clientX; // グローバル変数を使用
        stalkerTargetY = e.clientY; // グローバル変数を使用
        // 🚨 DEBUG: マウスの座標が更新されているか確認 🚨
        // console.log(`Mouse X: ${stalkerTargetX}`);
    }

    // 3. ホバーエフェクトの設定
    function setupHoverEffect() {
        const targets = document.querySelectorAll('a, button, [data-cursor-effect]'); 
        targets.forEach(target => {
            target.addEventListener('mouseenter', () => {
                stalkerInstance.classList.add('is-hovering');
            });
            target.addEventListener('mouseleave', () => {
                stalkerInstance.classList.remove('is-hovering');
            });
        });
    }

    document.addEventListener('mousemove', onMouseMove);
    setupHoverEffect();
    // 🚨 追従ロジック（gsap.ticker.add）は削除し、統合ループに移管
}

// =================================================================
// 💫. キラキラパーティクルエフェクト (マウス追従、十字形状、停止機能)
// =================================================================
function initSparkleEffect() {
    // 🚨 portfolio.html では即時終了 🚨
    if (document.body.classList.contains('portfolio-page')) {
        return; 
    }

    sparkleContainer = document.querySelector('.sparkle-container');
    if (!sparkleContainer) {
        console.warn("Sparkle container (.sparkle-container) が見つかりません。HTMLを確認してください。");
        return;
    }

    // マウスの静止判定ロジックはここで設定
    document.addEventListener('mousemove', (e) => {
        currentMouseX = e.clientX;
        currentMouseY = e.clientY;
        if (!isMouseMoving) {
            isMouseMoving = true;
        }
        clearTimeout(mouseMoveTimer);
        mouseMoveTimer = setTimeout(() => {
            isMouseMoving = false; 
        }, MOUSE_STOP_DELAY);
    });

    // 🚨 アニメーションループの開始（animateSparkleGenerator）は削除し、統合ループに移管
}

// =================================================================
// 🔗. ヘッダー/フッター読み込みとハンバーガーメニュー制御 (復活・追加)
// =================================================================

/**
 * HTMLファイルを読み込み、指定された要素に挿入する関数
 * @param {string} url - 読み込むHTMLファイルのパス
 * @param {string} selector - 挿入先のセレクタ
 */
function loadHTMLComponent(url, selector) {
    const element = document.querySelector(selector);
    if (element) {
        fetch(url)
            .then(response => response.text())
            .then(data => {
                element.innerHTML = data;
                
                // ヘッダー挿入後、ハンバーガー機能とスムーススクロールを初期化
                if (selector === '#header-placeholder') {
                    // 少し遅延させてDOMの反映を待つ（安全策）
                    setTimeout(() => {
                        initAnchorScroll(); 
                    }, 50);
                }
            })
            .catch(error => console.error('Error loading component:', url, error));
    }
}

/**
 * ハンバーガーメニューからのアンカーリンククリック時にスムーススクロールとメニュー閉鎖を処理
 */
function initAnchorScroll() {
    const naviToggle = document.getElementById('navi-toggle');
    
    // GSAPがロードされていることを確認
    if (typeof gsap === 'undefined') {
        console.warn("GSAP is required for anchor scrolling.");
        return;
    }

    document.querySelectorAll('[data-anchor]').forEach(link => {
        
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('data-anchor');
            
            // index.html内でのリンクの場合のみ処理
            if (document.body.classList.contains('portfolio-page') || !targetId) {
                return; 
            }

            e.preventDefault(); // デフォルトのジャンプを防止

            // メニューを閉じる
            if (naviToggle && naviToggle.checked) {
                naviToggle.checked = false;
            }

            // スムーススクロールを実行
            gsap.to(window, {
                duration: 1, 
                scrollTo: {
                    y: `#${targetId}`,
                    offset: -50 
                },
                ease: "power2.inOut",
                
                // ★★★ 修正箇所: スクロール完了時の処理 (Projects専用) ★★★
                onComplete: () => {
                    // Projectsセクションへの遷移が完了した場合のみ実行
                    if (targetId === 'projects-section' && typeof ScrollTrigger !== 'undefined') {
                        
                        // GSAPにスクロール位置を強制的に適用させるための処理
                        // Projectsセクションの ScrollTrigger のみを探して更新するのが理想ですが、
                        // 確実性を高めるため、全ての ScrollTrigger を更新します。

                        // 1. スクロールトリガーを一度リセットする
                        ScrollTrigger.getAll().forEach(trigger => {
                            if (trigger.trigger === '.projects-section') {
                                // ProjectsセクションのScrollTriggerを強制的に更新
                                trigger.update();
                            }
                        });
                        
                        // 2. わずかな遅延を入れ、全体をリフレッシュする
                        setTimeout(() => {
                            ScrollTrigger.refresh(true);
                        }, 50); 
                    }
                }
                // ★★★ 修正箇所 ここまで ★★★
            });
        });
    });
}


// =================================================================
// 7. ローディング画面制御 (ハッシュ遷移対応・Hero映り込み対策版)
// =================================================================
function initLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const loader = document.querySelector('#loading-screen .loader');
    
    if (!loadingScreen || !loader) return;

    const htmlEl = document.documentElement;

    // 1. Adobe Fontsの読み込み完了を待つロジック
    function checkFontsLoaded() {
        if (htmlEl.classList.contains('wf-active')) {
             window.addEventListener('load', () => {
                 processInitialNavigation(); 
             });
        } else if (document.readyState === 'complete') {
             processInitialNavigation();
        } else {
             window.addEventListener('load', () => {
                 processInitialNavigation();
             });
        }
    }
    
    // 2. 初回アクセスの遷移判定と処理
    function processInitialNavigation() {
        const hash = window.location.hash; // #projects-section などを取得

        if (hash) {
            // --- A. ハッシュがある場合 (portfolio.htmlから戻ってきた場合) ---
            const targetElement = document.querySelector(hash);
            
            if (targetElement) {
                // 1. 強制的にトップへ (初期化ズレ防止)
                window.scrollTo(0, 0);

                // 2. ★重要★ Heroセクションを即座に隠す
                // fixedで張り付いているHeroを、アニメーションを待たずに強制非表示にします
                if (document.querySelector('.hero')) {
                    gsap.set('.hero', { autoAlpha: 0 }); // opacity:0 + visibility:hidden
                }
                
                // 3. ローディング画面を出したまま、ターゲットへ移動
                gsap.to(window, {
                    duration: 0.1, // 即時移動に近い速度で
                    scrollTo: {
                        y: hash,
                        offset: -50, 
                        autoKill: false
                    },
                    onComplete: () => {
                        // 4. 移動完了後、ScrollTriggerを強力にリフレッシュ
                        // ReasonセクションなどのPin位置を正しく計算させます
                        ScrollTrigger.refresh(true);
                        
                        // 5. 少し待ってからローディング解除
                        setTimeout(() => {
                            hideLoadingScreen(true); // true = Heroアニメーションをスキップ
                            
                            // 念押しでScrollTriggerをもう一度更新 (WORKFLOW対策)
                            ScrollTrigger.refresh();
                        }, 300);
                    }
                });
            } else {
                hideLoadingScreen(false);
            }
        } else {
            // --- B. ハッシュがない場合 (通常のトップページアクセス) ---
            window.scrollTo(0, 0); 
            hideLoadingScreen(false); // false = Heroアニメーションを実行
        }
    }

    // 3. ローディング画面を非表示にする関数
    function hideLoadingScreen(skipHero) {
        if (loadingScreen.classList.contains('is-loaded')) {
            return;
        }

        loadingScreen.classList.add('is-loaded');
        
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            
            if (!skipHero) {
                // 通常アクセス時のみHeroアニメーション実行
                if (typeof startHeroAnimation === 'function') {
                    startHeroAnimation(); 
                }
            } else {
                // ★ハッシュ遷移時はHeroを確実に殺す★
                // 万が一アニメーションが動こうとしても、強制的に見えなくします
                gsap.set('.hero', { autoAlpha: 0, display: 'none' });
                
                // WORKFLOW (Reason) セクションなどが表示されるように、
                // 遷移先の要素の不透明度を確実に1にする（初期化で0になっている場合があるため）
                const hash = window.location.hash;
            }

        }, 600); 
    }

    checkFontsLoaded();
    
    setTimeout(() => {
        if (!loadingScreen.classList.contains('is-loaded')) {
             processInitialNavigation();
        }
    }, 5000); 
}

// =================================================================
// 🚀 全体初期化ブロック (最終修正版)
// =================================================================
(function() {

    // ★★★ 修正: ローディング画面の初期化を最優先で呼び出す ★★★
    initLoadingScreen(); 
    // ★★★ ここから他の処理を開始する ★★★
  
    // 1. ヘッダーとフッターの挿入（全ページ共通）
    loadHTMLComponent('header_menu.html', '#header-placeholder');
    loadHTMLComponent('footer_component.html', '#footer-placeholder'); 
    
    // 2. UI エフェクト初期化
    initMouseStalker();
    initSparkleEffect(); 

    // 3. メインページ専用処理 (index.htmlでのみ実行)
    if (!document.body.classList.contains('portfolio-page')) {
        
        // --------------------------------------------------------
        // 🚨 修正箇所: 変数宣言(const/let)を削除し、グローバル変数に代入 🚨
        // --------------------------------------------------------
        
        // TOPシステムの実体化
        canvasTop = document.querySelector('.canvas-top');
        if (canvasTop) {
            rendererTop = new THREE.WebGLRenderer({ canvas: canvasTop, alpha: true, preserveDrawingBuffer: true });
            rendererTop.setSize(window.innerWidth, window.innerHeight);
            rendererTop.setPixelRatio(window.devicePixelRatio || 1);
            sceneTop = new THREE.Scene();
            cameraTop = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            cameraTop.position.z = 6;
            startTimeTop = Date.now();
        }

        // CONTACTシステムの実体化
        canvasContact = document.querySelector('.canvas-contact');
        if (canvasContact) {
            rendererContact = new THREE.WebGLRenderer({ canvas: canvasContact, alpha: true, preserveDrawingBuffer: true });
            rendererContact.setSize(window.innerWidth, window.innerHeight);
            rendererContact.setPixelRatio(window.devicePixelRatio || 1);
            rendererContact.setClearColor(0x000000, 0); 
            sceneContact = new THREE.Scene();
            cameraContact = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            cameraContact.position.z = 6;
        }

        // --------------------------------------------------------

        // 1. サイズ合わせ
        onWindowResize(); 
        window.addEventListener('resize', onWindowResize);

        // 2. 各システムの初期化
        initTopParticles();        
        initContactParticles();    
        
        // 3. アニメーションループ開始
        animateTop();      
        animateContact();  
        
        // 4. 各セクションの初期化（関数化したもの）
        // initHeroAnimation();
        initProjectsSection();
        initParallaxSection(); // パララックスセクション
        initReasonSection();   // Reasonセクション
        initHowtoSection();    // Howtoセクション
        initAboutSection();    // Aboutセクション

        // 5. ScrollTrigger / UI 初期化
        controlContactParticlesVisibility(); 
        controlThemeChange();

    // 6. ★★★ 既存の ScrollTrigger.refresh を削除し、安定化関数を呼び出す ★★★
        // if (typeof ScrollTrigger !== 'undefined') {
        //   setTimeout(() => ScrollTrigger.refresh(), 200); // 🚨 この行を削除
        // }
        stabilizeScrollTrigger(); // ★★★ これを追加 ★★★
    }
  
})();