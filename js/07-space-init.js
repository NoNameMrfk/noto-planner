/* Deep space background and app init */
    let spaceAnimId = null;
    let spaceStars = null;
    let spacePointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let spaceReduced = false;

    function spaceThemeTint(theme) {
      const tints = {
        midnight:  { r: 18, g: 28, b: 48, neb: [36, 64, 110], star: [210, 220, 240], mono: false },
        forest:    { r: 12, g: 28, b: 18, neb: [28, 68, 42], star: [210, 230, 215], mono: false },
        black:     { r: 8,  g: 8,  b: 8,  neb: [40, 40, 40], star: [220, 220, 220], mono: true },
        vermilion: { r: 28, g: 12, b: 10, neb: [90, 32, 24], star: [245, 210, 195], mono: false }
      };
      return tints[theme] || tints.black;
    }

    function spaceThemes() {
      return ["midnight", "forest", "black", "vermilion"];
    }

    function initSpaceStars(w, h, dpr) {
      const countFar = Math.floor((w * h) / 9000);
      const countMid = Math.floor((w * h) / 28000);
      const countNear = Math.max(4, Math.floor((w * h) / 90000));
      const stars = { far: [], mid: [], near: [] };
      let rng = 42;
      const rand = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };
      for (let i = 0; i < countFar; i++) {
        stars.far.push({
          x: rand(), y: rand(),
          r: (0.3 + rand() * 0.7) * dpr,
          a: 0.12 + rand() * 0.28,
          drift: 0.00002 + rand() * 0.00004
        });
      }
      for (let i = 0; i < countMid; i++) {
        stars.mid.push({
          x: rand(), y: rand(),
          r: (0.6 + rand() * 1.1) * dpr,
          a: 0.22 + rand() * 0.35,
          drift: 0.00005 + rand() * 0.00008
        });
      }
      for (let i = 0; i < countNear; i++) {
        stars.near.push({
          x: rand(), y: rand(),
          r: (1.0 + rand() * 1.6) * dpr,
          a: 0.35 + rand() * 0.4,
          pulse: rand() * Math.PI * 2,
          pulseSpeed: 0.4 + rand() * 0.8
        });
      }
      return stars;
    }

    function drawSpace(ts) {
      const canvas = document.getElementById("spaceCanvas");
      if (!canvas) return;
      const theme = data.theme || "classic";
      const isDark = spaceThemes().includes(theme) && data.spaceBackground !== false;
      if (!isDark) {
        spaceAnimId = null;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cw = Math.max(1, Math.floor(w * dpr));
      const ch = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== cw || canvas.height !== ch || !spaceStars) {
        canvas.width = cw;
        canvas.height = ch;
        spaceStars = initSpaceStars(w, h, dpr);
      }
      const ctx = canvas.getContext("2d");
      const tint = spaceThemeTint(theme);
      const t = (ts || 0) * 0.001;

      ctx.fillStyle = `rgb(${Math.max(0, tint.r - 20)},${Math.max(0, tint.g - 20)},${Math.max(0, tint.b - 20)})`;
      ctx.fillRect(0, 0, cw, ch);

      if (!spaceReduced) {
        const nx = 0.5 + Math.sin(t * 0.015) * 0.08 + (spacePointer.x - 0.5) * 0.03;
        const ny = 0.35 + Math.cos(t * 0.012) * 0.06 + (spacePointer.y - 0.5) * 0.02;
        const g1 = ctx.createRadialGradient(cw * nx, ch * ny, 0, cw * nx, ch * ny, cw * 0.55);
        g1.addColorStop(0, `rgba(${tint.neb[0]},${tint.neb[1]},${tint.neb[2]},0.22)`);
        g1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, cw, ch);

        const nx2 = 0.25 + Math.cos(t * 0.01) * 0.05;
        const ny2 = 0.7 + Math.sin(t * 0.013) * 0.05;
        const g2 = ctx.createRadialGradient(cw * nx2, ch * ny2, 0, cw * nx2, ch * ny2, cw * 0.4);
        g2.addColorStop(0, `rgba(${tint.neb[0]},${tint.neb[1]},${tint.neb[2]},0.12)`);
        g2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, cw, ch);
      } else {
        const g1 = ctx.createRadialGradient(cw * 0.7, ch * 0.25, 0, cw * 0.7, ch * 0.25, cw * 0.5);
        g1.addColorStop(0, `rgba(${tint.neb[0]},${tint.neb[1]},${tint.neb[2]},0.14)`);
        g1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, cw, ch);
      }

      spacePointer.x += (spacePointer.tx - spacePointer.x) * 0.04;
      spacePointer.y += (spacePointer.ty - spacePointer.y) * 0.04;
      const px = (spacePointer.x - 0.5) * 12 * dpr;
      const py = (spacePointer.y - 0.5) * 10 * dpr;

      for (const s of spaceStars.far) {
        if (!spaceReduced) {
          s.x += s.drift * 0.3;
          if (s.x > 1) s.x -= 1;
        }
        const x = s.x * cw + px * 0.15;
        const y = s.y * ch + py * 0.15;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${tint.star[0]},${tint.star[1]},${tint.star[2]},${s.a})`;
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const s of spaceStars.mid) {
        if (!spaceReduced) {
          s.x += s.drift;
          if (s.x > 1) s.x -= 1;
        }
        const x = s.x * cw + px * 0.45;
        const y = s.y * ch + py * 0.4;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${tint.star[0]},${tint.star[1]},${tint.star[2]},${Math.min(1, s.a + 0.05)})`;
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const s of spaceStars.near) {
        let a = s.a;
        if (!spaceReduced) {
          a = s.a * (0.65 + 0.35 * Math.sin(t * s.pulseSpeed + s.pulse));
        }
        const x = s.x * cw + px * 0.85;
        const y = s.y * ch + py * 0.8;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${tint.star[0]},${tint.star[1]},${tint.star[2]},${a})`;
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = `rgba(${tint.star[0]},${tint.star[1]},${tint.star[2]},${a * 0.2})`;
        ctx.arc(x, y, s.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      spaceAnimId = requestAnimationFrame(drawSpace);
    }

    function startSpaceBackground() {
      if (spaceAnimId) {
        cancelAnimationFrame(spaceAnimId);
        spaceAnimId = null;
      }
      spaceStars = null;
      spaceReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const canvas = document.getElementById("spaceCanvas");
      const theme = data.theme || "classic";
      const isSpace = spaceThemes().includes(theme) && data.spaceBackground !== false;
      if (!isSpace) {
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
        }
        return;
      }
      spaceAnimId = requestAnimationFrame(drawSpace);
    }

    function updateAtmosphere() {
      startSpaceBackground();
    }

    window.addEventListener("pointermove", (e) => {
      spacePointer.tx = e.clientX / Math.max(1, window.innerWidth);
      spacePointer.ty = e.clientY / Math.max(1, window.innerHeight);
    }, { passive: true });

    let _spaceResize;
    window.addEventListener("resize", () => {
      clearTimeout(_spaceResize);
      _spaceResize = setTimeout(() => {
        spaceStars = null;
        updateAtmosphere();
      }, 180);
    });

    // Init
    document.querySelectorAll(".float-img, .moon-img").forEach(i => {
      if (i.complete && !i.naturalWidth) i.remove();
      else i.addEventListener("error", () => i.remove());
    });
    renderAll();
    updateAtmosphere();
    setInterval(() => {
      renderLiveClock();
      renderCompactStatus();
      updatePipWindow();
      // Keep the lessons "now" line in sync
      const lessonsView = document.getElementById("lessons");
      if (lessonsView && lessonsView.classList.contains("active")) {
        renderLessons();
      }
    }, 30000);
    setInterval(() => {
      renderLiveClock();
      renderCompactStatus();
      // Only refresh mini window if it is open
      if ((pipWindow && !pipWindow.closed) || document.getElementById("miniFallback")) {
        updatePipWindow();
      }
    }, 1000);
