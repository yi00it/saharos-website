(() => {
    'use strict';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ======================================================================
       Scroll loop — every scroll-linked effect registers here
       ====================================================================== */
    const scrollHandlers = [];
    let scrollQueued = false;
    const runScroll = () => {
        scrollQueued = false;
        scrollHandlers.forEach((fn) => fn());
    };
    const queueScroll = () => {
        if (!scrollQueued) {
            scrollQueued = true;
            requestAnimationFrame(runScroll);
        }
    };
    window.addEventListener('scroll', queueScroll, { passive: true });
    window.addEventListener('resize', queueScroll);

    /* ======================================================================
       Nav
       ====================================================================== */
    const nav = $('#nav');
    const toggle = $('#nav-toggle');
    const menu = $('#mobile-menu');
    let lastY = window.scrollY;
    let menuOpen = false;

    const setMenu = (open) => {
        menuOpen = open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menu.hidden = !open;
        nav.classList.toggle('is-scrolled', open || window.scrollY > 8);
    };
    toggle.addEventListener('click', () => setMenu(!menuOpen));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuOpen) setMenu(false);
    });

    scrollHandlers.push(() => {
        const y = window.scrollY;
        nav.classList.toggle('is-scrolled', y > 8 || menuOpen);
        const goingDown = y > lastY + 2;
        const goingUp = y < lastY - 2;
        if (goingDown && y > 480 && !menuOpen) nav.classList.add('is-hidden');
        else if (goingUp || y < 480) nav.classList.remove('is-hidden');
        lastY = y;
    });

    /* ======================================================================
       Reveal on enter
       ====================================================================== */
    const revealTargets = $$('.reveal');
    if (reducedMotion || !('IntersectionObserver' in window)) {
        revealTargets.forEach((el) => el.classList.add('is-in'));
    } else {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        revealTargets.forEach((el) => io.observe(el));
    }

    /* ======================================================================
       Hero — frame un-tilts as you scroll, shapes & cards parallax
       ====================================================================== */
    const heroFrame = $('#hero-frame');
    const parallaxEls = $$('[data-parallax]');
    if (heroFrame) {
        if (reducedMotion) {
            heroFrame.style.setProperty('--tilt', '0deg');
            heroFrame.style.setProperty('--scale', '1');
        } else {
            scrollHandlers.push(() => {
                const y = window.scrollY;
                const vh = window.innerHeight;
                if (y > vh * 1.6) return;
                const t = easeOut(clamp(y / (vh * 0.55)));
                heroFrame.style.setProperty('--tilt', `${(1 - t) * 18}deg`);
                heroFrame.style.setProperty('--scale', String(0.94 + t * 0.06));
                parallaxEls.forEach((el) => {
                    const f = parseFloat(el.dataset.parallax) || 0;
                    el.style.translate = `0 ${y * f}px`;
                });
            });
        }
    }

    /* ======================================================================
       Chaos → Clarity
       Ten scattered fragments of "project information" fly into a schedule.
       ====================================================================== */
    const chaos = $('#chaos');
    const stageBody = $('#stage-body');
    if (chaos && stageBody) {
        const SPAN = 48;
        // Each fragment becomes one activity on the schedule.
        const ROWS = [
            { k: 'xls',    name: 'Site mobilisation',   s: 0,  d: 3,  crit: true },
            { k: 'mail',   name: 'Excavation & shoring', s: 3,  d: 6,  crit: true },
            { k: 'chat',   name: 'Foundations',          s: 9,  d: 7,  crit: true },
            { k: 'voice',  name: 'Utility connections',  s: 9,  d: 5 },
            { k: 'note',   name: 'Structural frame',     s: 16, d: 12, crit: true },
            { k: 'pdf',    name: 'MEP rough-in',         s: 28, d: 8 },
            { k: 'urgent', name: 'Facade & curtain wall', s: 28, d: 9, crit: true },
            { k: 'img',    name: 'Fit-out & finishes',   s: 37, d: 7,  crit: true },
            { k: 'cal',    name: 'Inspections',          s: 44, d: 2,  crit: true },
            { k: 'ms',     name: 'Handover',             s: 46, d: 0,  crit: true, ms: true },
        ];
        const LINKS = [[0, 1], [1, 2], [1, 3], [2, 4], [4, 5], [4, 6], [3, 5], [5, 7], [6, 7], [7, 8], [8, 9]];
        // Scattered state: centre (fraction of stage) + rotation
        const SCATTER = [
            [0.24, 0.14, -7], [0.70, 0.11, 5], [0.84, 0.33, -4], [0.30, 0.36, 6], [0.60, 0.47, -11],
            [0.18, 0.60, 4], [0.76, 0.66, 8], [0.42, 0.78, -5], [0.84, 0.90, 3], [0.22, 0.90, -3],
        ];

        const frags = ROWS.map((r) => $(`.frag[data-k="${r.k}"]`, stageBody));
        const axis = $('#stage-axis');
        const labels = $('#stage-labels');
        const links = $('#stage-links');
        const meter = $('#chaos-meter');

        frags.forEach((el, i) => {
            const r = ROWS[i];
            el.style.setProperty('--bar', r.ms ? 'var(--gold)' : r.crit ? 'var(--terra)' : 'var(--blue)');
        });

        labels.innerHTML = ROWS.map((r) => `<span class="${r.crit ? 'crit' : ''}"><i></i>${r.name}</span>`).join('');
        const labelEls = $$('span', labels);
        links.innerHTML = LINKS.map(([a, b]) =>
            `<path pathLength="1" class="${ROWS[a].crit && ROWS[b].crit ? 'crit' : ''}" />`).join('');
        const linkEls = $$('path', links);

        let geo = null;

        const layout = () => {
            const W = stageBody.clientWidth;
            const H = stageBody.clientHeight;
            const labelW = W < 520 ? Math.round(W * 0.36) : Math.min(190, Math.round(W * 0.28));
            const x0 = labelW + 8;
            const dayW = (W - x0 - 18) / SPAN;
            const top = 34;
            const rowH = (H - top - 10) / ROWS.length;
            const barH = Math.max(8, Math.min(18, rowH * 0.5));

            axis.innerHTML = [0, 7, 14, 21, 28, 35, 42].map((d, i) =>
                `<span style="left:${x0 + d * dayW}px">W${i + 1}</span>`).join('') +
                `<span class="today" style="left:${x0 + 20 * dayW}px">Today</span>`;

            labelEls.forEach((el, i) => { el.style.top = `${top + i * rowH + rowH / 2}px`; });

            const items = ROWS.map((r, i) => {
                const el = frags[i];
                const body = el.firstElementChild;
                const nw = Math.min(body.offsetWidth + 2, W - 16);
                const nh = body.offsetHeight + 2;
                const [cx, cy, rot] = SCATTER[i];
                const sx = clamp(cx * W - nw / 2, 6, W - nw - 6);
                const sy = clamp(cy * H - nh / 2, 6, H - nh - 6);
                let tw = r.d * dayW;
                let th = barH;
                let tx = x0 + r.s * dayW;
                let trot = 0;
                if (r.ms) {
                    tw = th = barH * 0.85;
                    tx -= tw / 2;
                    trot = 45;
                }
                const ty = top + i * rowH + (rowH - th) / 2;
                return { sx, sy, rot, nw, nh, tx, ty, tw, th, trot };
            });

            links.setAttribute('width', W);
            links.setAttribute('height', H);
            LINKS.forEach(([a, b], j) => {
                const A = items[a];
                const B = items[b];
                const x1 = A.tx + A.tw;
                const y1 = A.ty + A.th / 2;
                const x2 = ROWS[b].ms ? B.tx : B.tx;
                const y2 = B.ty + B.th / 2;
                let d;
                if (x2 - x1 >= 10) {
                    d = `M${x1} ${y1} H${x1 + 5} V${y2} H${x2 - 1}`;
                } else {
                    const mid = A.ty + A.th + (rowH - A.th) / 2;
                    d = `M${x1} ${y1} H${x1 + 5} V${mid} H${x2 - 6} V${y2} H${x2 - 1}`;
                }
                linkEls[j].setAttribute('d', d);
            });

            geo = { items };
        };

        let progress = reducedMotion ? 1 : 0;
        let visible = false;
        let clock = 0;

        const render = (time) => {
            if (!geo) return;
            const m = clamp((progress - 0.1) / 0.6);
            const drift = reducedMotion ? 0 : 1;
            geo.items.forEach((it, i) => {
                const e = easeInOut(clamp(m * 1.45 - i * 0.05));
                const wob = (1 - e) * drift;
                const dx = Math.sin(time * 0.0007 + i * 1.3) * 7 * wob;
                const dy = Math.cos(time * 0.0006 + i * 2.1) * 6 * wob;
                const dr = Math.sin(time * 0.0005 + i) * 1.6 * wob;
                const x = lerp(it.sx, it.tx, e) + dx;
                const y = lerp(it.sy, it.ty, e) + dy;
                const r = lerp(it.rot, it.trot, e) + dr;
                const el = frags[i];
                el.style.width = `${lerp(it.nw, it.tw, e)}px`;
                el.style.height = `${lerp(it.nh, it.th, e)}px`;
                el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${r}deg)`;
                el.style.borderRadius = `${lerp(8, 3, e)}px`;
                el.style.setProperty('--m', e.toFixed(3));
            });
            const ui = clamp((m - 0.6) / 0.3);
            axis.style.setProperty('--ui', ui);
            labels.style.setProperty('--ui', ui);
            const draw = clamp((progress - 0.72) / 0.18);
            linkEls.forEach((p, j) => {
                const local = clamp(draw * 1.6 - j * 0.06);
                p.style.strokeDasharray = '1';
                p.style.strokeDashoffset = String(1 - local);
            });
            chaos.classList.toggle('is-clear', m > 0.62);
            meter.style.setProperty('--p', progress.toFixed(3));
        };

        const measureProgress = () => {
            if (reducedMotion) return;
            const rect = chaos.getBoundingClientRect();
            const total = rect.height - window.innerHeight;
            progress = clamp(-rect.top / total);
        };

        const loop = (t) => {
            clock = t;
            render(t);
            if (visible) requestAnimationFrame(loop);
        };

        const init = () => {
            layout();
            measureProgress();
            render(clock);
        };

        if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
        init();
        window.addEventListener('resize', () => { layout(); render(clock); });

        if (!reducedMotion) {
            scrollHandlers.push(measureProgress);
            new IntersectionObserver(([entry]) => {
                const was = visible;
                visible = entry.isIntersecting;
                if (visible && !was) requestAnimationFrame(loop);
            }).observe(chaos);
        }
    }

    /* ======================================================================
       Product tour — sticky frame follows the active step
       ====================================================================== */
    const steps = $$('.tour-step');
    const slides = $$('.tour-slide');
    const dots = $$('.tour-progress i');
    const tourUrl = $('#tour-url');
    if (steps.length && 'IntersectionObserver' in window) {
        const setStep = (idx) => {
            steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
            slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
            dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
            if (tourUrl) tourUrl.textContent = steps[idx].dataset.url;
        };
        setStep(0);
        const tio = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) setStep(Number(entry.target.dataset.step));
            });
        }, { rootMargin: '-45% 0px -45% 0px' });
        steps.forEach((s) => tio.observe(s));
    }

    /* ======================================================================
       Live CPM demo
       A genuine forward/backward pass over a small finish-to-start network.
       ====================================================================== */
    const cpmRoot = $('#cpm');
    if (cpmRoot) {
        const BASE = [
            { id: 'A', name: 'Site mobilisation',  short: 'Mobilise',    crew: 'Main contractor', dur: 4,  preds: [] },
            { id: 'B', name: 'Excavation',          short: 'Excavate',    crew: 'Groundworks',     dur: 8,  preds: ['A'] },
            { id: 'C', name: 'Foundations',         short: 'Foundations', crew: 'Concrete',        dur: 9,  preds: ['B'] },
            { id: 'D', name: 'Utility connections', short: 'Utilities',   crew: 'Utilities',       dur: 6,  preds: ['B'] },
            { id: 'E', name: 'Structural frame',    short: 'Frame',       crew: 'Steel erector',   dur: 12, preds: ['C'] },
            { id: 'F', name: 'MEP rough-in',        short: 'MEP',         crew: 'MEP',             dur: 8,  preds: ['E', 'D'] },
            { id: 'G', name: 'Facade',              short: 'Facade',      crew: 'Envelope',        dur: 10, preds: ['E'] },
            { id: 'H', name: 'Fit-out',             short: 'Fit-out',     crew: 'Interiors',       dur: 7,  preds: ['F', 'G'] },
            { id: 'M', name: 'Handover',            short: 'Handover',    crew: 'Milestone',       dur: 0,  preds: ['H'], ms: true },
        ];
        const index = Object.fromEntries(BASE.map((a, i) => [a.id, i]));
        const succs = BASE.map(() => []);
        BASE.forEach((a, i) => a.preds.forEach((p) => succs[index[p]].push(i)));
        const WORK = BASE.filter((a) => !a.ms).length;

        const state = BASE.map((a) => ({ dur: a.dur, lag: 0 }));

        const compute = () => {
            const t0 = performance.now();
            const n = BASE.length;
            const es = new Array(n);
            const ef = new Array(n);
            const ls = new Array(n);
            const lf = new Array(n);
            for (let i = 0; i < n; i++) {
                const start = BASE[i].preds.reduce((m, p) => Math.max(m, ef[index[p]]), 0);
                es[i] = start + state[i].lag;
                ef[i] = es[i] + state[i].dur;
            }
            const finish = Math.max(...ef);
            for (let i = n - 1; i >= 0; i--) {
                lf[i] = succs[i].length
                    ? Math.min(...succs[i].map((s) => ls[s] - state[s].lag))
                    : finish;
                ls[i] = lf[i] - state[i].dur;
            }
            const float = es.map((v, i) => ls[i] - v);
            const crit = float.map((f) => f === 0);
            return { es, ef, float, crit, finish, ms: performance.now() - t0 };
        };

        const ORIGINAL = compute();

        // DOM
        const chart = $('#cpm-chart');
        const rowsEl = $('#cpm-rows');
        const axisEl = $('#cpm-axis');
        const svg = $('#cpm-links');
        const hint = $('#cpm-hint');
        const finishEl = $('#cpm-finish');
        const deltaEl = $('#cpm-delta');
        const critEl = $('#cpm-crit');
        const timeEl = $('#cpm-time');
        const feed = $('#cpm-feed');

        rowsEl.innerHTML = BASE.map((a) => `
            <div class="cpm-row">
                <div class="cpm-label"><span class="ln">${a.name}</span><span class="ls">${a.short}</span><small>${a.crew}</small></div>
                <div class="cpm-track">
                    ${a.ms
                        ? '<span class="cpm-ms"></span><span class="cpm-ms-label"></span>'
                        : `<span class="cpm-float"><span></span></span>
                           <div class="cpm-bar" tabindex="0" role="button" data-i="${index[a.id]}">
                               <span class="dur"></span><span class="grip" aria-hidden="true"></span>
                           </div>`}
                </div>
            </div>`).join('');

        const rows = $$('.cpm-row', rowsEl).map((row, i) => ({
            track: $('.cpm-track', row),
            bar: $('.cpm-bar', row),
            dur: $('.dur', row),
            float: $('.cpm-float', row),
            floatLabel: $('.cpm-float span', row),
            ms: $('.cpm-ms', row),
            msLabel: $('.cpm-ms-label', row),
            a: BASE[i],
        }));

        svg.innerHTML = `
            <defs>
                <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="rgba(168,159,143,0.75)"/></marker>
                <marker id="arr-c" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#e05545"/></marker>
            </defs>` +
            BASE.flatMap((a, i) => a.preds.map((p) => `<path data-from="${index[p]}" data-to="${i}" />`)).join('');
        const linkEls = $$('path[data-from]', svg);

        let result = ORIGINAL;
        const spanFor = (finish) => Math.max(64, Math.ceil((finish + 8) / 8) * 8);
        // Displayed (tweened) values
        const disp = {
            es: ORIGINAL.es.slice(),
            dur: state.map((s) => s.dur),
            fl: ORIGINAL.float.slice(),
            span: spanFor(ORIGINAL.finish),
            finish: ORIGINAL.finish,
        };
        let targetSpan = disp.span;
        let dragging = null;
        let animating = false;

        const renderAxis = () => {
            const w = rows[0].track.clientWidth;
            const step = w / disp.span * 7 < 34 ? 14 : 7;
            let html = '';
            for (let d = 0, k = 1; d < disp.span - 4; d += step, k += step / 7) {
                html += `<span style="left:${(d / disp.span) * 100}%">W${k}</span>`;
            }
            axisEl.innerHTML = html;
        };
        let lastAxisSpan = 0;
        let lastAxisWidth = 0;

        const draw = () => {
            const span = disp.span;
            const W = rows[0].track.clientWidth;
            const rowH = rows[0].track.clientHeight;
            if (Math.round(span) !== lastAxisSpan || W !== lastAxisWidth) {
                lastAxisSpan = Math.round(span);
                lastAxisWidth = W;
                renderAxis();
            }
            const px = (d) => (d / span) * W;

            rows.forEach((r, i) => {
                const es = disp.es[i];
                const crit = result.crit[i];
                if (r.a.ms) {
                    r.ms.style.left = `${px(es)}px`;
                    r.msLabel.style.left = `${px(es)}px`;
                    r.msLabel.textContent = `Day ${Math.round(es)}`;
                    r.msLabel.style.transform = px(es) > W - 72 ? 'translate(calc(-100% - 16px), -50%)' : '';
                    return;
                }
                const dur = disp.dur[i];
                r.bar.style.left = `${px(es)}px`;
                r.bar.style.width = `${Math.max(px(dur), 6)}px`;
                r.bar.classList.toggle('is-crit', crit);
                r.dur.textContent = px(dur) > 30 ? `${state[i].dur}d` : '';
                const fl = disp.fl[i];
                if (fl > 0.05) {
                    r.float.style.display = 'block';
                    r.float.style.left = `${px(es + dur)}px`;
                    r.float.style.width = `${px(fl)}px`;
                    r.floatLabel.textContent = `${result.float[i]}d float`;
                } else {
                    r.float.style.display = 'none';
                }
                r.bar.setAttribute('aria-label',
                    `${r.a.name}: starts day ${result.es[i]}, ${state[i].dur} days, ` +
                    (crit ? 'on the critical path.' : `${result.float[i]} days of float.`) +
                    ' Arrow keys move it, Shift and arrow keys change its duration.');
            });

            svg.setAttribute('width', W);
            svg.setAttribute('height', rowH * rows.length);
            linkEls.forEach((p) => {
                const a = Number(p.dataset.from);
                const b = Number(p.dataset.to);
                const x1 = px(disp.es[a] + disp.dur[a]);
                const y1 = a * rowH + rowH / 2;
                const x2 = px(disp.es[b]) - (BASE[b].ms ? 9 : 1);
                const y2 = b * rowH + rowH / 2;
                const down = y2 > y1 ? 1 : -1;
                let d;
                if (x2 - x1 >= 14) {
                    d = `M${x1} ${y1} H${x1 + 6} V${y2} H${x2}`;
                } else {
                    const mid = y1 + down * rowH / 2;
                    d = `M${x1} ${y1} H${x1 + 6} V${mid} H${x2 - 10} V${y2} H${x2}`;
                }
                p.setAttribute('d', d);
                const crit = result.crit[a] && result.crit[b] && result.es[b] === result.ef[a] + state[b].lag;
                p.classList.toggle('crit', crit);
                p.setAttribute('marker-end', crit ? 'url(#arr-c)' : 'url(#arr)');
            });

            finishEl.textContent = Math.round(disp.finish);
        };

        const tick = () => {
            let moving = false;
            const k = reducedMotion ? 1 : 0.2;
            const approach = (cur, target) => {
                const next = lerp(cur, target, k);
                if (Math.abs(next - target) < 0.01) return target;
                moving = true;
                return next;
            };
            for (let i = 0; i < BASE.length; i++) {
                const direct = dragging && dragging.i === i;
                disp.es[i] = direct ? result.es[i] : approach(disp.es[i], result.es[i]);
                disp.dur[i] = direct ? state[i].dur : approach(disp.dur[i], state[i].dur);
                disp.fl[i] = approach(disp.fl[i], result.float[i]);
            }
            if (!dragging) disp.span = approach(disp.span, targetSpan);
            disp.finish = approach(disp.finish, result.finish);
            draw();
            if (moving) requestAnimationFrame(tick);
            else animating = false;
        };
        const kick = () => {
            if (!animating) {
                animating = true;
                requestAnimationFrame(tick);
            }
        };

        // Feed of consequences
        const pushFeed = (text, cls) => {
            const idle = $('.feed-idle', feed);
            if (idle) idle.remove();
            const li = document.createElement('li');
            li.className = cls;
            li.textContent = text;
            feed.prepend(li);
            while (feed.children.length > 5) feed.lastElementChild.remove();
        };

        const describe = (before, after) => {
            const msgs = [];
            BASE.forEach((a, i) => {
                if (a.ms) return;
                if (after.crit[i] && !before.crit[i]) msgs.push([`${a.name} is now on the critical path`, 'f-crit']);
                else if (!after.crit[i] && before.crit[i]) msgs.push([`${a.name} now has ${after.float[i]}d of float`, 'f-ok']);
            });
            if (after.finish !== before.finish) {
                const diff = after.finish - ORIGINAL.finish;
                if (diff === 0) msgs.push(['Handover back on programme — Day ' + after.finish, 'f-ok']);
                else if (diff > 0) msgs.push([`Handover slips to Day ${after.finish} (+${diff}d)`, 'f-late']);
                else msgs.push([`Handover pulled in to Day ${after.finish} (${diff}d)`, 'f-ok']);
            } else if (msgs.length === 0) {
                msgs.push(['Absorbed by float — handover unchanged', '']);
            }
            msgs.forEach(([t, c]) => pushFeed(t, c));
        };

        const updateStats = () => {
            const diff = result.finish - ORIGINAL.finish;
            deltaEl.textContent = diff === 0 ? 'On programme' : diff > 0 ? `+${diff}d late` : `${-diff}d early`;
            deltaEl.classList.toggle('is-late', diff > 0);
            critEl.textContent = result.crit.filter((c, i) => c && !BASE[i].ms).length;
            critEl.parentElement.lastChild.textContent = ` of ${WORK}`;
            timeEl.textContent = Math.max(result.ms, 0.01).toFixed(2);
        };

        const recalc = () => {
            result = compute();
            if (!dragging) targetSpan = spanFor(result.finish);
            updateStats();
            kick();
        };

        // Hint placement: point at Foundations
        const placeHint = () => {
            if (!hint || hint.classList.contains('is-gone')) return;
            const r = rows[index.C];
            const chartRect = chart.getBoundingClientRect();
            const barRect = r.bar.getBoundingClientRect();
            hint.style.left = `${barRect.left - chartRect.left + 4}px`;
            hint.style.top = `${barRect.bottom - chartRect.top + 10}px`;
        };
        let touched = false;
        const dismissHint = () => {
            touched = true;
            if (hint) hint.classList.add('is-gone');
        };

        // Pointer interaction
        rowsEl.addEventListener('pointerdown', (e) => {
            const bar = e.target.closest('.cpm-bar');
            if (!bar) return;
            e.preventDefault();
            dismissHint();
            const i = Number(bar.dataset.i);
            const W = rows[i].track.clientWidth;
            dragging = {
                i,
                bar,
                mode: e.target.classList.contains('grip') ? 'resize' : 'move',
                x: e.clientX,
                lag: state[i].lag,
                dur: state[i].dur,
                dayW: W / disp.span,
                before: result,
            };
            bar.setPointerCapture(e.pointerId);
            bar.classList.add('is-dragging');
            bar.focus({ preventScroll: true });
        });
        rowsEl.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dd = Math.round((e.clientX - dragging.x) / dragging.dayW);
            const s = state[dragging.i];
            if (dragging.mode === 'move') {
                const lag = clamp(dragging.lag + dd, 0, 30);
                if (lag === s.lag) return;
                s.lag = lag;
            } else {
                const dur = clamp(dragging.dur + dd, 1, 30);
                if (dur === s.dur) return;
                s.dur = dur;
            }
            recalc();
        });
        const endDrag = () => {
            if (!dragging) return;
            const { bar, before } = dragging;
            bar.classList.remove('is-dragging');
            dragging = null;
            const changed = before.es.some((v, i) => v !== result.es[i]) ||
                before.ef.some((v, i) => v !== result.ef[i]);
            if (changed) describe(before, result);
            recalc();
        };
        rowsEl.addEventListener('pointerup', endDrag);
        rowsEl.addEventListener('pointercancel', endDrag);

        rowsEl.addEventListener('keydown', (e) => {
            const bar = e.target.closest('.cpm-bar');
            if (!bar || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
            e.preventDefault();
            dismissHint();
            const i = Number(bar.dataset.i);
            const dir = e.key === 'ArrowRight' ? 1 : -1;
            const s = state[i];
            const before = result;
            if (e.shiftKey) s.dur = clamp(s.dur + dir, 1, 30);
            else s.lag = clamp(s.lag + dir, 0, 30);
            recalc();
            if (before.finish !== result.finish || before.crit.some((c, j) => c !== result.crit[j])) {
                describe(before, result);
            }
        });

        const reset = (silent) => {
            const before = result;
            BASE.forEach((a, i) => { state[i].dur = a.dur; state[i].lag = 0; });
            recalc();
            if (!silent) {
                feed.innerHTML = '';
                if (before.finish !== result.finish) pushFeed('Programme reset — handover Day ' + result.finish, 'f-ok');
                else pushFeed('Programme reset', '');
            }
        };
        $('#cpm-reset').addEventListener('click', () => { dismissHint(); reset(false); });

        if ('ResizeObserver' in window) {
            new ResizeObserver(() => { draw(); placeHint(); }).observe(chart);
        }
        recalc();
        draw();
        placeHint();

        // A short, self-playing example the first time the demo is seen:
        // MEP rough-in grows, eats its float, then pushes handover.
        if (!reducedMotion && 'IntersectionObserver' in window) {
            const F = index.F;
            const script = [
                [900, 9], [1250, 10], [1600, 11], [1950, 12],
                [4200, 11], [4450, 10], [4700, 9], [4950, 8],
            ];
            const dio = new IntersectionObserver(([entry]) => {
                if (!entry.isIntersecting) return;
                dio.disconnect();
                if (hint) hint.classList.add('is-gone');
                let prev = result;
                script.forEach(([at, dur]) => {
                    setTimeout(() => {
                        if (touched) return;
                        state[F].dur = dur;
                        recalc();
                        if (prev.finish !== result.finish || prev.crit.some((c, j) => c !== result.crit[j])) {
                            describe(prev, result);
                        }
                        prev = result;
                    }, at);
                });
                setTimeout(() => {
                    if (touched || !hint) return;
                    hint.classList.remove('is-gone');
                    placeHint();
                }, 5600);
            }, { threshold: 0.35 });
            dio.observe(cpmRoot);
        }
    }

    /* ======================================================================
       Story counter
       ====================================================================== */
    const counter = $('.story-num[data-count]');
    if (counter && !reducedMotion && 'IntersectionObserver' in window) {
        const target = Number(counter.dataset.count);
        counter.textContent = '0';
        const cio = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            cio.disconnect();
            const start = performance.now();
            const step = (t) => {
                const k = clamp((t - start) / 1600);
                counter.textContent = Math.round(easeOut(k) * target);
                if (k < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, { threshold: 0.5 });
        cio.observe(counter);
    }

    /* ======================================================================
       Request access — posts to the Saharos waitlist API
       ====================================================================== */
    const form = $('#access-form');
    if (form) {
        const status = $('#form-status');
        const done = $('#form-done');
        const doneText = $('#form-done-text');
        const label = $('.btn-label', form);
        const fields = ['name', 'email', 'company', 'role'];
        const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const showDone = (message) => {
            if (message) doneText.textContent = message;
            done.hidden = false;
            $('h3', done).focus();
        };

        form.addEventListener('input', (e) => {
            const field = e.target.closest('.field');
            if (field) field.classList.remove('is-invalid');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (form.classList.contains('is-sending')) return;
            status.textContent = '';

            const data = Object.fromEntries(fields.map((f) => [f, (form.elements[f].value || '').trim()]));
            data.email = data.email.toLowerCase();

            // Bots fill every field; people never see this one.
            if (form.elements.website.value) {
                showDone();
                return;
            }

            const invalid = fields.filter((f) => !data[f] || (f === 'email' && !EMAIL.test(data.email)));
            fields.forEach((f) => form.elements[f].closest('.field').classList.toggle('is-invalid', invalid.includes(f)));
            if (invalid.length) {
                status.textContent = invalid.includes('email') && data.email
                    ? 'Please enter a valid email address.'
                    : 'Please fill in all four fields.';
                form.elements[invalid[0]].focus();
                return;
            }

            form.classList.add('is-sending');
            label.textContent = 'Sending…';
            try {
                const res = await fetch(form.dataset.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (res.ok) {
                    showDone();
                } else if (res.status === 409) {
                    showDone("Good news — you're already on the list. We'll be in touch soon.");
                } else if (res.status === 429) {
                    status.textContent = 'Too many attempts from this network. Please try again in a little while.';
                } else {
                    status.textContent = 'Something went wrong on our side. Please try again, or email sales@saharos.com.';
                }
            } catch (err) {
                status.textContent = "We couldn't reach the server. Check your connection and try again, or email sales@saharos.com.";
            } finally {
                form.classList.remove('is-sending');
                label.textContent = 'Request early access';
            }
        });
    }

    queueScroll();
})();
