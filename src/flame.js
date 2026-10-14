// Brasa: el compañero. Una llama dibujada en canvas que crece con tu avance.
(function (root) {
  const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(h) {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  function Flame(canvas) {
    const ctx = canvas.getContext('2d');
    const st = {
      stage: 0, heat: 1, equip: {}, tint: '#ff7a1a', happyUntil: 0, pulse: 0, sleepy: false,
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
      const base = Math.min(w, h);
      const R = base * (0.13 + st.stage * 0.022) * (0.82 + st.heat * 0.18) * (1 + st.pulse * 0.18);
      return { cx: w / 2, cy: h * 0.66, R };
    }

    function spawn(g, ember, core) {
      const n = reduce ? 0 : Math.round(1 + st.stage * 0.6 + st.heat * 2);
      for (let i = 0; i < n; i++) {
        st.particles.push({
          x: g.cx + (Math.random() - 0.5) * g.R * 1.2,
          y: g.cy - g.R * 0.4,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(0.6 + Math.random() * 1.4) * (0.6 + st.heat * 0.6),
          life: 0, max: 30 + Math.random() * 40, r: g.R * (0.18 + Math.random() * 0.22)
        });
      }
      if (st.particles.length > 240) st.particles.splice(0, st.particles.length - 240);
    }

    function teardrop(cx, cy, R, wob) {
      const tipY = cy - R * (2.0 + st.heat * 0.4) + wob * R * 0.25;
      const tipX = cx + Math.sin(st.t / 23) * R * 0.18;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.bezierCurveTo(cx + R * 0.35, cy - R * 1.3, cx + R * 1.08, cy - R * 0.55, cx + R, cy);
      ctx.arc(cx, cy, R, 0, Math.PI, false);
      ctx.bezierCurveTo(cx - R * 1.08, cy - R * 0.55, cx - R * 0.35, cy - R * 1.3, tipX, tipY);
      ctx.closePath();
    }

    function drawLogs(g) {
      ctx.save();
      ctx.translate(g.cx, g.cy + g.R * 0.95);
      const lw = g.R * 2.6, lh = g.R * 0.34;
      [-0.22, 0.22].forEach(a => {
        ctx.save(); ctx.rotate(a);
        ctx.fillStyle = '#5a3a26';
        ctx.beginPath(); ctx.roundRect(-lw / 2, -lh / 2, lw, lh, lh / 2); ctx.fill();
        ctx.fillStyle = '#8a5a3a';
        ctx.beginPath(); ctx.arc(lw / 2 - lh / 2, 0, lh / 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    function drawFace(g, now, lid) {
      const eyeY = g.cy - g.R * 0.15, dx = g.R * 0.36, er = g.R * 0.17;
      const happy = now < st.happyUntil;
      const blinking = now > st.blinkAt && now < st.blinkEnd;
      if (now > st.blinkEnd) { st.blinkAt = now + 2200 + Math.random() * 3800; st.blinkEnd = st.blinkAt + 130; }
      ctx.lineCap = 'round';
      [-1, 1].forEach(s => {
        const ex = g.cx + s * dx;
        if (happy) {
          ctx.strokeStyle = '#2a1206'; ctx.lineWidth = Math.max(2, er * 0.45);
          ctx.beginPath(); ctx.arc(ex, eyeY + er * 0.3, er * 0.75, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
          return;
        }
        if (blinking) {
          ctx.strokeStyle = '#2a1206'; ctx.lineWidth = Math.max(2, er * 0.4);
          ctx.beginPath(); ctx.moveTo(ex - er, eyeY); ctx.lineTo(ex + er, eyeY); ctx.stroke();
          return;
        }
        ctx.fillStyle = '#fffaf0';
        ctx.beginPath(); ctx.ellipse(ex, eyeY, er, er * 1.15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1206';
        ctx.beginPath(); ctx.arc(ex + st.look[0] * er * 0.45, eyeY + st.look[1] * er * 0.45, er * 0.55, 0, Math.PI * 2); ctx.fill();
        if (st.sleepy) {
          ctx.fillStyle = lid;
          ctx.beginPath(); ctx.rect(ex - er * 1.2, eyeY - er * 1.4, er * 2.4, er * 1.35); ctx.fill();
        }
      });
      // boca
      ctx.strokeStyle = '#2a1206'; ctx.lineWidth = Math.max(1.5, er * 0.3);
      ctx.beginPath();
      if (happy) ctx.arc(g.cx, g.cy + g.R * 0.18, g.R * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
      else if (st.sleepy) { ctx.moveTo(g.cx - g.R * 0.08, g.cy + g.R * 0.3); ctx.lineTo(g.cx + g.R * 0.08, g.cy + g.R * 0.3); }
      else ctx.arc(g.cx, g.cy + g.R * 0.12, g.R * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
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
          ctx.fillStyle = '#3c3f44';
          ctx.fillRect(cx - R * 0.9, cy + R * 1.1, R * 0.12, R * 0.6); ctx.fillRect(cx + R * 0.78, cy + R * 1.1, R * 0.12, R * 0.6);
          ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.85, R * 1.35, R * 0.45, 0, 0, Math.PI); ctx.fill();
          ctx.fillStyle = '#5b6068'; ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.85, R * 1.35, R * 0.14, 0, 0, Math.PI * 2); ctx.fill();
        }
      } else if (layer === 'front') {
        if (E.base === 'piedras') {
          for (let i = 0; i < 7; i++) {
            const x = cx + (i - 3) * R * 0.42, y = cy + R * 1.05 + Math.abs(i - 3) * -R * 0.06;
            ctx.fillStyle = i % 2 ? '#7d8288' : '#9aa0a6';
            ctx.beginPath(); ctx.ellipse(x, y, R * 0.24, R * 0.17, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (E.neck === 'bufanda') {
          const y = cy + R * 0.42, wdt = R * 1.85, hh = R * 0.3;
          ctx.fillStyle = '#d7463c';
          ctx.beginPath(); ctx.roundRect(cx - wdt / 2, y, wdt, hh, hh / 2); ctx.fill();
          ctx.beginPath(); ctx.roundRect(cx + R * 0.35, y + hh * 0.5, R * 0.3, R * 0.75, R * 0.08); ctx.fill();
          ctx.fillStyle = '#f3ead8';
          for (let i = -3; i <= 3; i += 2) ctx.fillRect(cx + i * R * 0.22, y + 1, R * 0.12, hh - 2);
          ctx.fillRect(cx + R * 0.35, y + hh * 0.5 + R * 0.45, R * 0.3, R * 0.1);
        } else if (E.neck === 'corbatin') {
          const y = cy + R * 0.62;
          ctx.fillStyle = '#3b6fd8';
          ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx - R * 0.42, y - R * 0.22); ctx.lineTo(cx - R * 0.42, y + R * 0.22); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + R * 0.42, y - R * 0.22); ctx.lineTo(cx + R * 0.42, y + R * 0.22); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#2a54b0'; ctx.beginPath(); ctx.arc(cx, y, R * 0.1, 0, Math.PI * 2); ctx.fill();
        }
        const hy = cy - R * 0.62;
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
        const ey = cy - R * 0.15;
        ctx.fillStyle = '#20232b';
        ctx.beginPath(); ctx.ellipse(cx, ey, R * 0.78, R * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(cx - R * 0.98, ey - R * 0.05, R * 0.3, R * 0.1); ctx.fillRect(cx + R * 0.68, ey - R * 0.05, R * 0.3, R * 0.1);
      } else if (layer === 'faceOver') {
        const ey = cy - R * 0.15, dx = R * 0.36;
        ctx.strokeStyle = '#2a1206'; ctx.lineWidth = Math.max(1.5, R * 0.06);
        if (E.face === 'lentes') {
          ctx.beginPath(); ctx.arc(cx - dx, ey, R * 0.27, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx + dx, ey, R * 0.27, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - dx + R * 0.27, ey); ctx.quadraticCurveTo(cx, ey - R * 0.1, cx + dx - R * 0.27, ey); ctx.stroke();
        } else if (E.face === 'monoculo') {
          ctx.strokeStyle = '#c9a23a';
          ctx.beginPath(); ctx.arc(cx + dx, ey, R * 0.28, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = Math.max(1, R * 0.025);
          ctx.beginPath(); ctx.moveTo(cx + dx + R * 0.2, ey + R * 0.2); ctx.quadraticCurveTo(cx + R * 0.8, cy + R * 0.5, cx + R * 0.55, cy + R * 0.8); ctx.stroke();
        }
      }
      ctx.restore();
    }

    function frame(now) {
      raf = 0;
      if (!visible) return;
      st.t += 1;
      st.pulse *= 0.92;
      ctx.clearRect(0, 0, w, h);
      const g = geometry();
      const tint = hexToRgb(st.tint);
      // La llama siempre es fuego; el tipo de tarea que más haces tiñe su corazón.
      const ember = [255, 122, 26];
      const core = mix([255, 240, 200], tint, 0.25);
      const flare = [255, 196, 90];

      // halo
      const halo = ctx.createRadialGradient(g.cx, g.cy - g.R * 0.6, g.R * 0.3, g.cx, g.cy - g.R * 0.6, g.R * (3.2 + st.stage * 0.3));
      halo.addColorStop(0, rgba(ember, 0.28 * st.heat + 0.05));
      halo.addColorStop(1, rgba(ember, 0));
      ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);

      drawEquip('back', g);
      if (st.stage >= 3 && !(st.equip && st.equip.base === 'brasero')) drawLogs(g);

      // partículas
      spawn(g, ember, core);
      ctx.save();
      for (const p of st.particles) {
        p.life++; p.x += p.vx + Math.sin((p.life + p.y) / 9) * 0.3; p.y += p.vy; p.r *= 0.985;
        const k = p.life / p.max;
        if (k >= 1) continue;
        const c = mix(flare, ember, Math.min(1, k * 1.4));
        ctx.fillStyle = rgba(c, (1 - k) * 0.6);
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.r), 0, Math.PI * 2); ctx.fill();
      }
      st.particles = st.particles.filter(p => p.life < p.max);
      ctx.restore();

      // cuerpo
      const wob = reduce ? 0 : Math.sin(st.t / 11) + Math.sin(st.t / 7) * 0.5;
      teardrop(g.cx, g.cy, g.R, wob);
      const body = ctx.createRadialGradient(g.cx, g.cy + g.R * 0.1, 0, g.cx, g.cy - g.R * 0.3, g.R * 1.9);
      body.addColorStop(0, rgba(core, 1));
      body.addColorStop(0.22, rgba(mix(core, flare, 0.5), 1));
      body.addColorStop(0.45, rgba(flare, 1));
      body.addColorStop(0.7, rgba(ember, 1));
      body.addColorStop(1, rgba(mix(ember, [150, 30, 10], 0.35), 1));
      ctx.fillStyle = body; ctx.fill();
      // anillo del faro
      if (st.stage >= 5) {
        ctx.strokeStyle = rgba(core, 0.5 + 0.2 * Math.sin(st.t / 15)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(g.cx, g.cy - g.R * 2.7, g.R * 0.7, g.R * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
      }
      drawEquip('faceUnder', g);
      drawFace(g, now, rgba(flare, 1));
      drawEquip('faceOver', g);
      drawEquip('front', g);
      if (st.sleepy && !reduce) {
        ctx.fillStyle = rgba(core, 0.7);
        ctx.font = `600 ${Math.round(g.R * 0.45)}px system-ui, sans-serif`;
        const z = (st.t / 40) % 1;
        ctx.fillText('z', g.cx + g.R * 0.9, g.cy - g.R * (1.2 + z));
      }
      if (!reduce || now < st.happyUntil) raf = requestAnimationFrame(frame);
    }

    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    root.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.6);
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
      set(opts) { Object.assign(st, opts); kick(); },
      feed(strength) {
        st.pulse = Math.min(1.4, st.pulse + (strength || 0.6));
        st.happyUntil = performance.now() + 1300;
        kick();
      },
      center() {
        const r = canvas.getBoundingClientRect(); const g = geometry();
        return [r.left + g.cx, r.top + g.cy - g.R * 0.3];
      }
    };
  }

  root.BrasaFlame = Flame;
})(window);
