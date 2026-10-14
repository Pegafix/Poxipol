// Mochi: el compañero. Una bolita blanca con orejitas y panza rosada que flota y crece con tu avance.
(function (root) {
  const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = '#2b2530';

  function Pet(canvas, opts) {
    const ctx = canvas.getContext('2d');
    const fit = (opts && opts.fit) || 'card'; // scene: sobre el escritorio · card: vista previa · icon: barra
    const st = {
      stage: 0, heat: 1, tint: '#ff8fb1', equip: {}, ground: 0.8, happyUntil: 0, pulse: 0, sleepy: false,
      alert: 1, drowsy: false, yawnAt: 0, yawnUntil: 0, symbol: null,
      mood: 'neutral', expr: null, ojeras: false, sweat: false, winkAt: 0,
      blinkAt: 0, blinkEnd: 0, look: [0, 0], particles: [], t: 0
    };
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, root.devicePixelRatio || 1);
      w = Math.max(10, r.width); h = Math.max(10, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function geometry() {
      const grow = 0.86 + st.stage * 0.035;
      // Más despierto = flota más alto y más rápido; con sueño se mece lento y bajito.
      const amp = st.sleepy ? 0.025 : 0.035 + 0.055 * st.alert;
      const bob = reduce ? 0 : Math.sin(st.t / (st.sleepy ? 70 : 58 - 22 * st.alert)) * amp;
      const droop = st.sleepy ? 0.1 : (1 - st.alert) * 0.06;
      let R, ground, cy;
      if (fit === 'icon') {
        R = Math.min(w, h) * 0.34; ground = h; cy = h * (0.56 + droop * 0.3) + bob * R;
      } else {
        R = (fit === 'scene' ? Math.min(w * 0.25, h * 0.15) : Math.min(w * 0.26, h * 0.2)) * grow;
        ground = fit === 'scene' ? h * st.ground : h * 0.88;
        cy = ground - R * (1.45 - droop) + bob * R;
      }
      R *= 1 + st.pulse * 0.1;
      return { cx: w / 2, cy, R, ground, lift: bob };
    }

    function spawnHearts(g, n) {
      for (let i = 0; i < n; i++) {
        st.particles.push({
          x: g.cx + (Math.random() - 0.5) * g.R * 1.6, y: g.cy - g.R * 0.6,
          vx: (Math.random() - 0.5) * 0.8, vy: -(0.8 + Math.random() * 1.2),
          life: 0, max: 50 + Math.random() * 30, r: g.R * (0.1 + Math.random() * 0.08), heart: Math.random() < 0.6
        });
      }
    }
    function heart(x, y, r) {
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.9);
      ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.45);
      ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
      ctx.fill();
    }

    // ---------- equipo ----------
    function star(x, y, r, rot) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.38 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    }
    function drawEquip(layer, g) {
      const E = st.equip || {}, R = g.R, cx = g.cx, cy = g.cy, t = st.t;
      ctx.save();
      if (layer === 'back') {
        if (E.aura === 'luciernagas') {
          for (let i = 0; i < 6; i++) {
            const a = t / 70 + i * 1.05, x = cx + Math.cos(a) * R * (1.7 + 0.2 * Math.sin(t / 30 + i)), y = cy - R * 0.6 + Math.sin(a * 1.3) * R * 1.1;
            const gl = ctx.createRadialGradient(x, y, 0, x, y, R * 0.25);
            gl.addColorStop(0, 'rgba(230,255,140,.95)'); gl.addColorStop(1, 'rgba(230,255,140,0)');
            ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, R * 0.25, 0, Math.PI * 2); ctx.fill();
          }
        } else if (E.aura === 'estrellas') {
          ctx.fillStyle = '#ffe9a8';
          for (let i = 0; i < 7; i++) {
            const a = i * 0.9 + 0.4, x = cx + Math.cos(a * 2.3) * R * 1.9, y = cy - R * 0.9 + Math.sin(a * 3.1) * R * 1.3;
            ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t / 25 + i));
            star(x, y, R * 0.13, t / 60);
          }
        } else if (E.aura === 'chispas') {
          ctx.fillStyle = '#7fc4ff';
          for (let i = 0; i < 8; i++) {
            const k = ((t / 90) + i / 8) % 1, x = cx + Math.sin(i * 2.1 + t / 40) * R * 1.4, y = cy + R * 0.5 - k * R * 3.2;
            ctx.globalAlpha = 1 - k; star(x, y, R * 0.09, i);
          }
        }
        ctx.globalAlpha = 1;
        if (E.base === 'brasero') {
          const gy = g.ground, bw = R * 2.1, bh = R * 0.26;
          [['#5b7bd6', 0.1], ['#e07a5f', -0.06], ['#81b29a', 0.04]].forEach(([c, off], i) => {
            ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(cx - bw / 2 + off * R, gy - bh * (i + 1), bw, bh - 2, 3); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(cx - bw / 2 + off * R + bw - R * 0.2, gy - bh * (i + 1) + 3, R * 0.12, bh - 8);
          });
        }
      } else if (layer === 'front') {
        if (E.base === 'piedras') {
          const gy = g.ground;
          ctx.fillStyle = '#9b7fd1';
          ctx.beginPath(); ctx.ellipse(cx, gy - R * 0.2, R * 1.25, R * 0.3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b39ce0';
          ctx.beginPath(); ctx.ellipse(cx, gy - R * 0.3, R * 1.05, R * 0.18, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#7a5fb3'; ctx.beginPath(); ctx.arc(cx, gy - R * 0.28, R * 0.06, 0, Math.PI * 2); ctx.fill();
        }
        if (E.neck === 'bufanda') {
          const y = cy + R * 0.12, wdt = R * 1.9, hh = R * 0.26;
          ctx.fillStyle = '#d7463c';
          ctx.beginPath(); ctx.roundRect(cx - wdt / 2, y, wdt, hh, hh / 2); ctx.fill();
          ctx.beginPath(); ctx.roundRect(cx + R * 0.35, y + hh * 0.5, R * 0.3, R * 0.75, R * 0.08); ctx.fill();
          ctx.fillStyle = '#f3ead8';
          for (let i = -3; i <= 3; i += 2) ctx.fillRect(cx + i * R * 0.22, y + 1, R * 0.12, hh - 2);
          ctx.fillRect(cx + R * 0.35, y + hh * 0.5 + R * 0.45, R * 0.3, R * 0.1);
        } else if (E.neck === 'corbatin') {
          const y = cy + R * 0.3, bw = R * 0.26, bh = R * 0.15;
          ctx.fillStyle = '#3b6fd8';
          ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx - bw, y - bh); ctx.lineTo(cx - bw, y + bh); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + bw, y - bh); ctx.lineTo(cx + bw, y + bh); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#2a54b0'; ctx.beginPath(); ctx.arc(cx, y, R * 0.065, 0, Math.PI * 2); ctx.fill();
        }
        // joyas del Taller
        if (E.joya) {
          const ex = cx + R * 0.74, eyy = cy - R * 0.5;
          if (E.joya === 'perlas') {
            for (let i = -3; i <= 3; i++) {
              const a = i / 3 * 0.9, x = cx + Math.sin(a) * R * 0.62, y = cy + R * 0.16 + Math.cos(a) * R * 0.1;
              ctx.fillStyle = '#f4f1ea'; ctx.strokeStyle = '#cfc6b6'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.arc(x, y, R * (i === 0 ? 0.075 : 0.06), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
          } else if (E.joya === 'broche') {
            const bx = cx - R * 0.5, by = cy + R * 0.32;
            ctx.fillStyle = '#d8806a'; ctx.beginPath(); ctx.arc(bx, by, R * 0.11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f2b6a0'; ctx.beginPath(); ctx.arc(bx, by, R * 0.06, 0, Math.PI * 2); ctx.fill();
          } else if (E.joya === 'pulsera') {
            ctx.strokeStyle = '#ff8fb1'; ctx.lineWidth = Math.max(2, R * 0.05); ctx.setLineDash([R * 0.06, R * 0.04]);
            ctx.beginPath(); ctx.ellipse(cx - R * 0.56, cy - R * 0.6, R * 0.2, R * 0.07, -0.45, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#6fbf8e'; ctx.beginPath(); ctx.arc(cx - R * 0.42, cy - R * 0.55, R * 0.045, 0, Math.PI * 2); ctx.fill();
          } else {
            // arete colgando de la orejita derecha
            const col = { anillo: '#9aa3b8', amuleto: '#6ec5ff', dije: '#ffd166' }[E.joya] || '#ccc';
            ctx.strokeStyle = '#c9a23a'; ctx.lineWidth = Math.max(1, R * 0.025);
            ctx.beginPath(); ctx.arc(ex, eyy, R * 0.05, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = col;
            const sw = Math.sin(t / 25) * R * 0.03;
            if (E.joya === 'dije') star(ex + sw, eyy + R * 0.14, R * 0.09, t / 30);
            else { ctx.beginPath(); ctx.moveTo(ex + sw, eyy + R * 0.05); ctx.lineTo(ex + sw + R * 0.06, eyy + R * 0.14); ctx.lineTo(ex + sw, eyy + R * 0.24); ctx.lineTo(ex + sw - R * 0.06, eyy + R * 0.14); ctx.closePath(); ctx.fill(); }
          }
        }
        const hy = cy - R * 0.84;
        if (E.head === 'gorro') {
          ctx.fillStyle = '#c8423b';
          ctx.beginPath(); ctx.ellipse(cx, hy, R * 0.82, R * 0.78, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.roundRect(cx - R * 0.9, hy - R * 0.08, R * 1.8, R * 0.26, R * 0.1); ctx.fill();
          ctx.beginPath(); ctx.arc(cx, hy - R * 0.82, R * 0.2, 0, Math.PI * 2); ctx.fill();
        } else if (E.head === 'casco') {
          ctx.fillStyle = '#f2b630';
          ctx.beginPath(); ctx.ellipse(cx, hy, R * 0.85, R * 0.72, 0, Math.PI, 0); ctx.fill();
          ctx.beginPath(); ctx.ellipse(cx, hy, R * 1.05, R * 0.14, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#5a4a2a'; ctx.beginPath(); ctx.roundRect(cx - R * 0.2, hy - R * 0.55, R * 0.4, R * 0.3, R * 0.06); ctx.fill();
          const gl = ctx.createRadialGradient(cx, hy - R * 0.4, 0, cx, hy - R * 0.4, R * 0.5);
          gl.addColorStop(0, 'rgba(255,250,200,1)'); gl.addColorStop(0.3, 'rgba(255,250,200,.6)'); gl.addColorStop(1, 'rgba(255,250,200,0)');
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, hy - R * 0.4, R * 0.5, 0, Math.PI * 2); ctx.fill();
        } else if (E.head === 'mago') {
          ctx.fillStyle = '#5b3fa8';
          ctx.beginPath(); ctx.moveTo(cx - R * 0.75, hy); ctx.quadraticCurveTo(cx - R * 0.1, hy - R * 1.2, cx + R * 0.45, hy - R * 1.85); ctx.lineTo(cx + R * 0.75, hy); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.ellipse(cx, hy, R * 1.1, R * 0.17, -0.05, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffd95a'; star(cx - R * 0.05, hy - R * 0.55, R * 0.14, 0.3); star(cx + R * 0.3, hy - R * 1.05, R * 0.1, 0.8);
        } else if (E.head === 'corona') {
          ctx.fillStyle = '#f5c542';
          ctx.beginPath();
          ctx.moveTo(cx - R * 0.7, hy + R * 0.05); ctx.lineTo(cx - R * 0.78, hy - R * 0.6); ctx.lineTo(cx - R * 0.38, hy - R * 0.25);
          ctx.lineTo(cx, hy - R * 0.78); ctx.lineTo(cx + R * 0.38, hy - R * 0.25); ctx.lineTo(cx + R * 0.78, hy - R * 0.6); ctx.lineTo(cx + R * 0.7, hy + R * 0.05);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#e0465b'; ctx.beginPath(); ctx.arc(cx, hy - R * 0.15, R * 0.11, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3fb3e0'; ctx.beginPath(); ctx.arc(cx - R * 0.4, hy - R * 0.08, R * 0.08, 0, Math.PI * 2); ctx.arc(cx + R * 0.4, hy - R * 0.08, R * 0.08, 0, Math.PI * 2); ctx.fill();
        }
      } else if (layer === 'faceUnder' && E.face === 'antifaz') {
        const ey = cy - R * 0.14;
        ctx.fillStyle = '#20232b';
        ctx.beginPath(); ctx.ellipse(cx, ey, R * 0.7, R * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(cx - R * 0.98, ey - R * 0.05, R * 0.3, R * 0.1); ctx.fillRect(cx + R * 0.68, ey - R * 0.05, R * 0.3, R * 0.1);
      } else if (layer === 'faceOver') {
        const ey = cy - R * 0.14, dx = R * 0.32;
        ctx.strokeStyle = '#2a1206'; ctx.lineWidth = Math.max(1.5, R * 0.06);
        if (E.face === 'lentes') {
          ctx.beginPath(); ctx.arc(cx - dx, ey, R * 0.2, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx + dx, ey, R * 0.2, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - dx + R * 0.2, ey); ctx.quadraticCurveTo(cx, ey - R * 0.08, cx + dx - R * 0.2, ey); ctx.stroke();
        } else if (E.face === 'monoculo') {
          ctx.strokeStyle = '#c9a23a';
          ctx.beginPath(); ctx.arc(cx + dx, ey, R * 0.2, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = Math.max(1, R * 0.025);
          ctx.beginPath(); ctx.moveTo(cx + dx + R * 0.2, ey + R * 0.2); ctx.quadraticCurveTo(cx + R * 0.8, cy + R * 0.5, cx + R * 0.55, cy + R * 0.8); ctx.stroke();
        }
      }
      ctx.restore();
    }


    function drawBody(g, now) {
      const { cx, cy, R } = g;
      // sombra sobre el escritorio
      if (fit !== 'icon') {
        const s = 1 - g.lift * 1.5;
        ctx.fillStyle = 'rgba(30,20,40,.16)';
        ctx.beginPath(); ctx.ellipse(cx, g.ground - R * 0.06, R * 0.78 * s, R * 0.13 * s, 0, 0, Math.PI * 2); ctx.fill();
      }
      // orejitas
      [-1, 1].forEach(s => {
        ctx.save(); ctx.translate(cx + s * R * 0.56, cy - R * 0.72); ctx.rotate(s * 0.45);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(80,60,90,.16)'; ctx.lineWidth = Math.max(1, R * 0.035);
        ctx.beginPath(); ctx.ellipse(0, 0, R * 0.24, R * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffc3d3'; ctx.beginPath(); ctx.ellipse(0, R * 0.02, R * 0.13, R * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      // cuerpo
      const gr = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#fbfafd'); gr.addColorStop(1, '#e9e6f0');
      ctx.fillStyle = gr; ctx.strokeStyle = 'rgba(80,60,90,.16)'; ctx.lineWidth = Math.max(1, R * 0.035);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // panza rosada
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.985, 0, Math.PI * 2); ctx.clip();
      const pb = ctx.createRadialGradient(cx, cy + R * 0.5, R * 0.05, cx, cy + R * 0.55, R * 0.6);
      pb.addColorStop(0, '#ffd3df'); pb.addColorStop(1, '#ffb3c8');
      ctx.fillStyle = pb; ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.58, R * 0.5, R * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // cachetes
      const e = currentExpr(now);
      ctx.fillStyle = e === 'love' || e === 'shy' ? 'rgba(255,120,160,.75)' : 'rgba(255,150,180,.45)';
      ctx.beginPath(); ctx.ellipse(cx - R * 0.56, cy + R * 0.04, R * 0.13, R * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + R * 0.56, cy + R * 0.04, R * 0.13, R * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Expresión vigente: una temporal (express) manda sobre el ánimo de fondo (mood).
    function currentExpr(now) {
      if (st.sleepy) return st.expr && now < st.expr.until && st.expr.wake ? st.expr.name : 'sleep';
      if (st.expr && now < st.expr.until) return st.expr.name;
      if (now < st.happyUntil) return 'happy';
      if (now < st.yawnUntil) return 'yawn';
      if (st.mood === 'neutral' && st.alert >= 0.8 && now > st.winkAt) {
        if (st.winkAt) { st.expr = { name: 'wink', until: now + 700 }; st.winkAt = now + 25000 + Math.random() * 30000; return 'wink'; }
        st.winkAt = now + 20000 + Math.random() * 20000;
      }
      if (st.drowsy && (st.mood === 'neutral' || st.mood === 'sparkle')) return 'drowsy';
      if (st.mood === 'apathetic' && now < st.blinkEnd && now > st.blinkAt) return 'sleep';
      return st.mood;
    }

    function brows(cx, y, dx, er, kind) {
      // kind: 'angry' (\ /) o 'sad' (/ \)
      ctx.lineWidth = Math.max(1.2, er * 0.55);
      [-1, 1].forEach(s => {
        const x0 = cx + s * dx - er * 1.3, x1 = cx + s * dx + er * 1.3;
        const inner = kind === 'angry' ? er * 0.6 : -er * 0.6;
        ctx.beginPath();
        if (s < 0) { ctx.moveTo(x0, y - er * 2.3 - inner * 0.0); ctx.lineTo(x1, y - er * 2.3 + inner); }
        else { ctx.moveTo(x0, y - er * 2.3 + inner); ctx.lineTo(x1, y - er * 2.3); }
        ctx.stroke();
      });
    }

    function drawFace(g, now) {
      const { cx, cy, R } = g;
      const ey = cy - R * 0.14, dx = R * 0.32, er = R * 0.075;
      const blinking = now > st.blinkAt && now < st.blinkEnd;
      if (now > st.blinkEnd) {
        // con sueño parpadea más lento y más seguido
        st.blinkAt = now + (st.drowsy ? 1400 : 2400) + Math.random() * (st.drowsy ? 2000 : 3600);
        st.blinkEnd = st.blinkAt + (st.drowsy ? 420 : 140);
      }
      if (st.drowsy && !st.sleepy && !reduce && now > st.yawnAt) {
        if (st.yawnAt) st.yawnUntil = now + 1600;
        st.yawnAt = now + 9000 + Math.random() * 9000;
      }
      const e = currentExpr(now);
      let lx = st.look[0] * R * 0.04 * st.alert, ly = st.look[1] * R * 0.03 * st.alert;
      if (e === 'thinking') { lx = R * 0.035; ly = -R * 0.035; }
      ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1.4, R * 0.055);
      const arcUp = (x, y) => { ctx.beginPath(); ctx.arc(x, y + er * 0.6, er * 1.2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); };
      const closed = (x, y) => { ctx.beginPath(); ctx.arc(x, y - er * 0.4, er * 1.1, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); };
      const dot = (x, y, k) => {
        ctx.beginPath(); ctx.arc(x, y, er * k, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + er * 0.35 * k, y - er * 0.35 * k, er * 0.32 * k, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = INK;
      };
      // ojeras (mal dormir): medialunas moradas bajo los ojos
      const oj = st.ojeras === true ? 1 : Math.min(3, st.ojeras || 0);
      if (oj && e !== 'sleep') {
        // ojeras: más marcadas mientras peor durmió (1 a 3 malestares)
        ctx.save(); ctx.strokeStyle = `rgba(120,90,160,${0.28 + 0.14 * oj})`; ctx.lineWidth = Math.max(1.5, er * (0.45 + 0.15 * oj));
        [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(cx + s * dx, ey + er * (0.55 + 0.05 * oj), er * (1.2 + 0.1 * oj), Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); });
        ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.4, R * 0.055);
      }
      [-1, 1].forEach(s => {
        const ex = cx + s * dx + lx, y = ey + ly;
        switch (e) {
          case 'happy': arcUp(ex, y); break;
          case 'wink': if (s < 0) dot(ex, y, 1); else arcUp(ex, y); break;
          case 'sleep': closed(ex, y); break;
          case 'yawn': case 'squint': {
            const tip = ex - s * er * 0.6, arm = ex + s * er;
            ctx.beginPath(); ctx.moveTo(arm, y - er * 0.8); ctx.lineTo(tip, y); ctx.lineTo(arm, y + er * 0.8); ctx.stroke(); break;
          }
          case 'surprised': dot(ex, y, 1.45); break;
          case 'love': ctx.fillStyle = '#ff5f8f'; heart(ex, y + er * 0.2, er * 1.25); ctx.fillStyle = INK; break;
          case 'dizzy': {
            ctx.lineWidth = Math.max(1, R * 0.03); ctx.beginPath();
            for (let a = 0; a < Math.PI * 5; a += 0.3) { const rr = er * 0.15 * a / Math.PI * 1.1; ctx.lineTo(ex + Math.cos(a + st.t / 8 * s) * rr, y + Math.sin(a + st.t / 8 * s) * rr); }
            ctx.stroke(); ctx.lineWidth = Math.max(1.4, R * 0.055); break;
          }
          case 'drowsy': {
            // cansado: ojito a media asta con el párpado caído hacia afuera
            ctx.beginPath(); ctx.arc(ex, y + er * 0.1, er, 0.05 * Math.PI, 0.95 * Math.PI); ctx.closePath(); ctx.fill();
            ctx.lineWidth = Math.max(1.2, R * 0.04);
            ctx.beginPath(); ctx.moveTo(ex - s * er * 1.1, y - er * 0.25); ctx.quadraticCurveTo(ex, y - er * 0.35, ex + s * er * 1.45, y + er * 0.35); ctx.stroke();
            ctx.lineWidth = Math.max(1.4, R * 0.055); break;
          }
          case 'apathetic': {
            ctx.beginPath(); ctx.arc(ex, y + er * 0.15, er * 0.9, 0, Math.PI); ctx.closePath(); ctx.fill();
            ctx.lineWidth = Math.max(1.2, R * 0.04);
            ctx.beginPath(); ctx.moveTo(ex - er * 1.3, y + er * 0.1); ctx.lineTo(ex + er * 1.3, y + er * 0.1); ctx.stroke();
            ctx.lineWidth = Math.max(1.4, R * 0.055); break;
          }
          case 'grumpy': {
            ctx.beginPath(); ctx.arc(ex, y, er, 0, Math.PI); ctx.closePath(); ctx.fill();
            ctx.lineWidth = Math.max(1.2, R * 0.04);
            ctx.beginPath(); ctx.moveTo(ex - er * 1.4, y - er * 0.15); ctx.lineTo(ex + er * 1.4, y - er * 0.15); ctx.stroke();
            ctx.lineWidth = Math.max(1.4, R * 0.055); break;
          }
          case 'sparkle': {
            dot(ex, y, 1.2); ctx.fillStyle = '#fff'; star(ex - er * 0.35, y + er * 0.3, er * 0.45, st.t / 20); ctx.fillStyle = INK; break;
          }
          case 'shy': ctx.beginPath(); ctx.arc(ex, y + er * 0.2, er * 0.75, 0, Math.PI * 2); ctx.fill(); break;
          default: if (blinking) closed(ex, y); else dot(ex, y, 1 + 0.15 * st.alert);
        }
      });
      if (e === 'grumpy') brows(cx + lx, ey + ly, dx, er, 'angry');
      if (e === 'sad') brows(cx + lx, ey + ly, dx, er, 'sad');
      if (e === 'thinking') { ctx.lineWidth = Math.max(1.2, er * 0.5); ctx.beginPath(); ctx.moveTo(cx + dx - er * 1.2 + lx, ey - er * 2.4); ctx.lineTo(cx + dx + er * 1.2 + lx, ey - er * 2.8); ctx.stroke(); }

      const my = cy + R * 0.05 + ly, mw = R * 0.12;
      ctx.lineWidth = Math.max(1.1, R * 0.028);
      if (e === 'yawn') {
        const k = now < st.yawnUntil ? Math.sin(Math.min(1, (st.yawnUntil - now) / 1600) * Math.PI) : 0.6 + 0.3 * Math.sin(st.t / 10);
        ctx.fillStyle = '#7a3448';
        ctx.beginPath(); ctx.ellipse(cx, my + R * 0.04, R * 0.07, R * (0.04 + 0.08 * k), 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = INK;
      } else if (e === 'surprised') {
        ctx.fillStyle = '#7a3448'; ctx.beginPath(); ctx.ellipse(cx, my + R * 0.05, R * 0.05, R * 0.065, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = INK;
      } else if (e === 'grumpy' || e === 'sad') {
        ctx.beginPath(); ctx.arc(cx + lx, my + R * 0.1, R * 0.07, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      } else if (e === 'apathetic') {
        ctx.beginPath(); ctx.moveTo(cx - R * 0.07 + lx, my + R * 0.04); ctx.lineTo(cx + R * 0.07 + lx, my + R * 0.04); ctx.stroke();
      } else if (e === 'thinking') {
        ctx.beginPath(); ctx.moveTo(cx - R * 0.02 + lx, my + R * 0.03); ctx.lineTo(cx + R * 0.09 + lx, my + R * 0.01); ctx.stroke();
      } else if (e === 'dizzy') {
        ctx.beginPath();
        for (let x = -mw; x <= mw; x += mw / 4) ctx.lineTo(cx + x, my + R * 0.03 + Math.sin(x / mw * Math.PI * 2 + st.t / 6) * R * 0.02);
        ctx.stroke();
      } else if (e === 'sleep' && Math.sin(st.t / 70) > 0.6) {
        // a veces duerme con la boquita abierta
        ctx.beginPath(); ctx.ellipse(cx, my + R * 0.03, R * 0.035, R * 0.025, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        // boca ":3" (ω)
        ctx.beginPath();
        ctx.arc(cx - mw / 2 + lx, my, mw / 2, Math.PI, 0, true);
        ctx.arc(cx + mw / 2 + lx, my, mw / 2, Math.PI, 0, true);
        ctx.stroke();
      }
      // gotita de sudor (cansancio por mucho trabajo) o de nervios al despertarlo
      if ((st.sweat || e === 'grumpy' || e === 'dizzy') && e !== 'sleep') {
        const sx = cx + R * 0.72, sy = cy - R * 0.45 + Math.sin(st.t / 20) * R * 0.02;
        ctx.fillStyle = 'rgba(120,190,255,.9)';
        ctx.beginPath(); ctx.moveTo(sx, sy - R * 0.12); ctx.quadraticCurveTo(sx + R * 0.08, sy, sx, sy + R * 0.06); ctx.quadraticCurveTo(sx - R * 0.08, sy, sx, sy - R * 0.12); ctx.fill();
        ctx.fillStyle = INK;
      }
    }

    function drawSymbol(g, now) {
      const sy = st.symbol;
      if (!sy || now > sy.until || fit === 'icon') return;
      const k = 1 - (sy.until - now) / 1800;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
      ctx.fillStyle = sy.ch === '!' ? '#ffb020' : '#7fb6ff';
      ctx.font = `800 ${Math.round(g.R * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(sy.ch, g.cx + g.R * 0.95, g.cy - g.R * (0.85 + k * 0.25));
      ctx.restore();
    }

    function frame(now) {
      raf = 0;
      if (!visible) return;
      st.t += 1;
      st.pulse *= 0.9;
      ctx.clearRect(0, 0, w, h);
      const g = geometry();
      drawEquip('back', g);
      // halo de las etapas altas
      if (st.stage >= 5) {
        ctx.strokeStyle = 'rgba(255,214,120,' + (0.65 + 0.2 * Math.sin(st.t / 15)) + ')'; ctx.lineWidth = Math.max(2, g.R * 0.06);
        ctx.beginPath(); ctx.ellipse(g.cx, g.cy - g.R * 1.35, g.R * 0.45, g.R * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
      }
      drawBody(g, now);
      drawEquip('faceUnder', g);
      drawFace(g, now);
      drawEquip('faceOver', g);
      drawEquip('front', g);
      drawSymbol(g, now);
      // corazones y destellos al comer tareas
      for (const p of st.particles) {
        p.life++; p.x += p.vx; p.y += p.vy; p.vy *= 0.985;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = p.heart ? '#ff7fa6' : st.tint;
        if (p.heart) heart(p.x, p.y, p.r); else star(p.x, p.y, p.r, p.life / 10);
      }
      ctx.globalAlpha = 1;
      st.particles = st.particles.filter(p => p.life < p.max);
      if (st.sleepy && !reduce && fit !== 'icon') {
        ctx.fillStyle = 'rgba(120,110,150,.8)';
        ctx.font = `600 ${Math.round(g.R * 0.32)}px system-ui, sans-serif`;
        const z = (st.t / 60) % 1;
        ctx.globalAlpha = 1 - z;
        ctx.fillText('z', g.cx + g.R * 0.85 + z * g.R * 0.3, g.cy - g.R * (0.9 + z * 0.6));
        ctx.globalAlpha = 1;
      }
      if (!reduce || st.particles.length || now < st.happyUntil || (st.symbol && now < st.symbol.until) || (st.expr && now < st.expr.until + 50)) raf = requestAnimationFrame(frame);
    }

    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    root.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.5);
      const d = Math.hypot(dx, dy) || 1;
      st.look = [dx / Math.max(d, 120), dy / Math.max(d, 120)];
      if (reduce) kick();
    }, { passive: true });
    if ('IntersectionObserver' in root) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
    }
    if ('ResizeObserver' in root) new ResizeObserver(() => { resize(); kick(); }).observe(canvas);
    resize();

    return {
      set(o) { Object.assign(st, o); kick(); },
      feed(strength) {
        st.pulse = Math.min(1.4, st.pulse + (strength || 0.6));
        st.happyUntil = performance.now() + 1400;
        if (fit !== 'icon') spawnHearts(geometry(), Math.round(3 + (strength || 0.6) * 4));
        kick();
      },
      pop(ch) { st.symbol = { ch, until: performance.now() + 1800 }; kick(); },
      express(name, ms, wake) { st.expr = { name, until: performance.now() + (ms || 2500), wake: !!wake }; kick(); },
      center() {
        const r = canvas.getBoundingClientRect(); const g = geometry();
        return [r.left + g.cx, r.top + g.cy + g.R * 0.5];
      }
    };
  }

  root.MochiPet = Pet;
})(window);
