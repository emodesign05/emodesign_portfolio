// const canvas = document.getElementById('canvas');
// const ctx = canvas.getContext('2d');
// canvas.width = window.innerWidth;
// canvas.height = window.innerHeight;

// window.requestAnimationFrame = 
//   window.requestAnimationFrame ||
//   window.mozRequestAnimationFrame ||
//   window.weblitRequestAnimationFrame ||
//   window.msRequestAnimationFrame ||
//   function (cb) { setTimeout(cb, 17); };

// const NUM = 400; // 表示数
// const particles = [];
// const mouse = {
//   x: null,
//   y: null,
//   radius: 50,
// }
// // マウス
// window.addEventListener('mousemove', (event) => {
//   mouse.x = event.x;
//   mouse.y = event.y;
// });
// // タッチ
// window.addEventListener('touchstart', (event) => {
//   if (event.touches.length > 0) {
//     mouse.x = event.touches[0].clientX;
//     mouse.y = event.touches[0].clientY;
//   }
// });
// window.addEventListener('touchmove', (event) => {
//   if (event.touches.length > 0) {
//     mouse.x = event.touches[0].clientX;
//     mouse.y = event.touches[0].clientY;
//   }
// });
// window.addEventListener('touchend', () => {
//   mouse.x = null;
//   mouse.y = null;
// });
// class Particle {
//   constructor(x, y, radius, directionX, directionY, index) {
//     this.x = x;
//     this.y = y;
//     this.radius = radius;
//     this.directionX = directionX;
//     this.directionY = directionY;
//     this.index = index;
//   }
//   render() {
//     // 色の設定
//     this.setColor();

//     // パーティクルの描画     
//     ctx.beginPath();
//     ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
//   }
//   setColor() {
//     if(this.index % 3 === 0) {
//       ctx.fillStyle = "#fff";
//       ctx.fill();
//     } else if (this.index % 3 === 1) {
//       ctx.strokeStyle = "#fff";
//       ctx.lineWidth = 1;
//       ctx.stroke()
//     } else {
//       ctx.globalAlpha = 0.8;
//       ctx.fillStyle = "#0f0091";
//       ctx.fill();
//     }
//   }
//   update () {


//     // もし衝突していたらカーソルから離れるようにする
//     if (this.detectCollision()) {
//       if (this.x > mouse.x) {
//         this.x += this.radius;
//         if (this.directionX < 0) this.directionX = -this.directionX;
//       }
//       if (this.x < mouse.x) {
//         this.x -= this.radius;
//         if (this.directionX > 0) this.directionX = -this.directionX;
//       }
//       if (this.y > mouse.y) {
//         this.y += this.radius;
//         if (this.y < 0) this.directionY = -this.directionY;
//       }
//       if (this.y < mouse.y) {
//         this.y -= this.radius;
//         if (this.y > 0) this.directionY = -this.directionY;
//       }
//     }
    
//     this.x += this.directionX;
//     this.y += this.directionY;
    
//     if (this.x > canvas.width + this.radius || this.x < this.radius) {
//       this.directionX = -this.directionX
//     }
//     if (this.y > canvas.height + this.radius || this.y < this.radius) {
//       this.directionY = -this.directionY
//     }


//     this.render();
//   }
//   detectCollision () {
//     // 衝突しているかどうか
//     const dx = mouse.x - this.x;
//     const dy = mouse.y - this.y;
//     const distance = Math.sqrt(dx * dx + dy * dy);
//     return distance < mouse.radius + this.radius;
//   }
// }

// init();
// render();

// function init() {
//   for(let i = 0; i < NUM; i++) {
//     // particles 
//     const x = Math.random() * canvas.width;
//     const y = Math.floor(Math.random() * canvas.height);
//     const radius = Math.floor(Math.random() * 10);
//     const directionX = Math.random() * 2;
//     const directionY = Math.random() * 2 - 1;
//     const particle = new Particle(x, y, radius, directionX, directionY, i);
//     particles.push(particle);
//   }
// }

// function render() {
//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   for(let i = 0; i < particles.length; i++) {
//     particles[i].update();
//   }
//   requestAnimationFrame(render);
// }

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.requestAnimationFrame =
  window.requestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function (cb) { setTimeout(cb, 17); };

const NUM = 300;
const particles = [];
const popParticles = [];
const mouse = {
  x: null,
  y: null,
  radius: 50,
};

// ==== マウス・タッチ対応 ====
window.addEventListener('mousemove', (event) => {
  mouse.x = event.x;
  mouse.y = event.y;
});
window.addEventListener('touchstart', (event) => {
  if (event.touches.length > 0) {
    mouse.x = event.touches[0].clientX;
    mouse.y = event.touches[0].clientY;
  }
});
window.addEventListener('touchmove', (event) => {
  if (event.touches.length > 0) {
    mouse.x = event.touches[0].clientX;
    mouse.y = event.touches[0].clientY;
  }
});
window.addEventListener('touchend', () => {
  mouse.x = null;
  mouse.y = null;
});

class Particle {
  constructor(x, y, radius, directionX, directionY, index, type) {
    this.init(x, y, radius, directionX, directionY, index, type);
  }

  init(x, y, radius, directionX, directionY, index, type) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.originalRadius = radius;
    this.directionX = directionX;
    this.directionY = directionY;
    this.index = index;
    this.opacity = 1;
    this.isPopping = false;
    this.type = type; // "explode" または "avoid"
  }

  render() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);

    if (this.isPopping) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffffff';
    } else {
      ctx.shadowBlur = 0;
    }

    this.setColor();
  }

  setColor() {
    ctx.globalAlpha = this.opacity;

    if (this.index % 3 === 0) {
      ctx.fillStyle = "#fff";
      ctx.fill();
    } else if (this.index % 3 === 1) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = "#0f0091";
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  update() {
    if (this.detectCollision()) {
      if (this.type === "explode") {
        if (!this.isPopping) this.explode(); // 初回のみ
        this.isPopping = true;
        this.radius -= 0.4;
        this.opacity -= 0.05;
      } else if (this.type === "avoid") {
        this.avoidMouse();
      }
    } else {
      this.isPopping = false;
    }

    if (this.radius <= 0 || this.opacity <= 0) {
      // 再生成
      this.init(
        Math.random() * canvas.width,
        canvas.height + Math.random() * 50,
        Math.random() * 10 + 2,
        0,
        -Math.random() * 2,
        this.index,
        this.type
      );
    }

    this.x += this.directionX;
    this.y += this.directionY;

    if (this.y < -this.radius) {
      this.y = canvas.height + this.radius;
    }

    this.render();
  }

  avoidMouse() {
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const force = 3;
    if (dist !== 0) {
      this.x += (dx / dist) * force;
      this.y += (dy / dist) * force;
    }
  }

  detectCollision() {
    if (mouse.x === null || mouse.y === null) return false;
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < mouse.radius + this.radius;
  }

  explode() {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      popParticles.push(new PopParticle(this.x, this.y, dx, dy));
    }
  }
}

class PopParticle {
  constructor(x, y, dx, dy) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.life = 30;
    this.opacity = 1;
    this.radius = 2;
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
    this.life--;
    this.opacity -= 0.03;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.fill();
  }
}

function init() {
  for (let i = 0; i < NUM; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 10 + 2;
    const directionX = 0;
    const directionY = -Math.random() * 2;
    const type = i % 2 === 0 ? "explode" : "avoid"; // 半分ずつ
    const particle = new Particle(x, y, radius, directionX, directionY, i, type);
    particles.push(particle);
  }
}

function render() {
  // 泡の軌跡を残す
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
  }

  for (let i = popParticles.length - 1; i >= 0; i--) {
    popParticles[i].update();
    if (popParticles[i].life <= 0 || popParticles[i].opacity <= 0) {
      popParticles.splice(i, 1);
    }
  }

  requestAnimationFrame(render);
}

init();
render();
