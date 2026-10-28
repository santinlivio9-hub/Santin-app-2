/* =========================================================================
   Chibi Arsenal — audio 100 % Web Audio API (aucun fichier externe)
   - Musique lofi générative : accords de piano électrique, basse ronde,
     batterie feutrée, mélodie pentatonique, craquements de vinyle.
   - Bruitages : plop (lâcher), pop pétillant (fusion), jingle (nouvelle arme)…
   ========================================================================= */
(function () {
  'use strict';

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // Progression lofi (Fmaj9 → Em7 → Dm9 → Cmaj9), basse à la fondamentale.
  const PROG = [
    { notes: [53, 57, 60, 64, 67], bass: 41 },
    { notes: [52, 55, 59, 62, 64], bass: 40 },
    { notes: [50, 53, 57, 60, 64], bass: 38 },
    { notes: [48, 52, 55, 59, 62], bass: 36 }
  ];
  const PENTA = [72, 74, 76, 79, 81, 84, 86];
  const BPM = 74;

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.musicOn = true;
      this.sfxOn = true;
      this.playing = false;
      this.step = 0;
      this.nextTime = 0;
      this.timer = null;
      this.lastMel = 3;
    }

    /** À appeler dans un geste utilisateur (iOS). */
    unlock() {
      if (!this.ctx) this._init();
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    }

    _init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp).connect(ctx.destination);

      // Réverbe douce (réponse impulsionnelle générée).
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._impulse(2.4, 2.6);
      const revOut = ctx.createGain();
      revOut.gain.value = 0.32;
      this.reverb.connect(revOut).connect(this.master);

      // Bus musique : filtre passe-bas "lofi".
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.musicOn ? 0.62 : 0;
      const warm = ctx.createBiquadFilter();
      warm.type = 'lowpass';
      warm.frequency.value = 2600;
      warm.Q.value = 0.3;
      this.musicBus.connect(warm).connect(this.master);
      this.musicSend = ctx.createGain();
      this.musicSend.gain.value = 0.6;
      this.musicBus.connect(this.musicSend).connect(this.reverb);

      // Écho (delay) pour la mélodie.
      this.delay = ctx.createDelay(1);
      this.delay.delayTime.value = (60 / BPM) * 0.75;
      const fb = ctx.createGain();
      fb.gain.value = 0.32;
      const dlp = ctx.createBiquadFilter();
      dlp.type = 'lowpass';
      dlp.frequency.value = 1800;
      this.delay.connect(dlp).connect(fb).connect(this.delay);
      dlp.connect(this.musicBus);

      // Piano électrique : trémolo + légère instabilité de bande (wow).
      this.keys = ctx.createGain();
      const kf = ctx.createBiquadFilter();
      kf.type = 'lowpass';
      kf.frequency.value = 1500;
      this.keys.connect(kf).connect(this.musicBus);
      const trem = ctx.createOscillator();
      trem.frequency.value = 4.2;
      const tremDepth = ctx.createGain();
      tremDepth.gain.value = 0.14;
      trem.connect(tremDepth).connect(this.keys.gain);
      trem.start();
      this.wow = ctx.createOscillator();
      this.wow.frequency.value = 0.33;
      this.wowDepth = ctx.createGain();
      this.wowDepth.gain.value = 7;
      this.wow.connect(this.wowDepth);
      this.wow.start();

      // Bus effets.
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 0.9 : 0;
      this.sfxBus.connect(this.master);
      this.sfxSend = ctx.createGain();
      this.sfxSend.gain.value = 0.25;
      this.sfxBus.connect(this.sfxSend).connect(this.reverb);

      this.noise = this._noiseBuffer(2);
      this._startVinyl();
    }

    _impulse(sec, decay) {
      const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    _noiseBuffer(sec) {
      const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    _startVinyl() {
      const ctx = this.ctx, len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        let v = (Math.random() * 2 - 1) * 0.012;              // souffle
        if (Math.random() < 0.0004) v += (Math.random() * 2 - 1) * 0.6; // craquement
        d[i] = v;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2400;
      f.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      src.connect(f).connect(g).connect(this.musicBus);
      src.start();
    }

    // ------------------------------------------------------------- réglages
    setMusic(on) {
      this.musicOn = on;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setTargetAtTime(on && this.playing ? 0.62 : 0, t, 0.15);
    }

    setSfx(on) {
      this.sfxOn = on;
      if (this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
    }

    // -------------------------------------------------------------- musique
    startMusic() {
      if (!this.ctx || this.playing) return;
      this.playing = true;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.setMusic(this.musicOn);
      this.timer = setInterval(() => this._schedule(), 30);
    }

    stopMusic() {
      if (!this.playing) return;
      this.playing = false;
      clearInterval(this.timer);
      if (this.ctx) this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }

    suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
    resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

    _schedule() {
      const sixteenth = 60 / BPM / 4;
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        // Swing léger sur les doubles-croches impaires.
        const swing = (this.step % 2) ? sixteenth * 0.28 : 0;
        if (this.musicOn) this._playStep(this.step, this.nextTime + swing);
        this.nextTime += sixteenth;
        this.step = (this.step + 1) % 64;
      }
    }

    _playStep(step, t) {
      const bar = Math.floor(step / 16), s = step % 16;
      const chord = PROG[bar];

      if (s === 0) this._chord(chord.notes, t, 3.0, 1);
      if (s === 10 && Math.random() < 0.55) this._chord(chord.notes.slice(1, 4), t, 1.4, 0.55);

      if (s === 0) this._bass(chord.bass, t, 1.6);
      if (s === 8) this._bass(chord.bass + (Math.random() < 0.3 ? 7 : 0), t, 0.9);
      if (s === 14 && Math.random() < 0.4) this._bass(chord.bass + 12, t, 0.3, 0.5);

      if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.3)) this._kick(t);
      if (s === 4 || s === 12) this._snare(t);
      if (s % 2 === 0) this._hat(t, s % 4 === 0 ? 1 : 0.6);

      if (s % 2 === 0 && s !== 0 && Math.random() < 0.16) {
        this.lastMel = Math.max(0, Math.min(PENTA.length - 1, this.lastMel + Math.floor(Math.random() * 5) - 2));
        this._bell(PENTA[this.lastMel], t);
      }
    }

    _chord(notes, t, dur, vel) {
      notes.forEach((n, i) => this._ep(n, t + i * 0.018 + Math.random() * 0.01, dur, vel * (0.85 + Math.random() * 0.15)));
    }

    _ep(note, t, dur, vel) {
      const ctx = this.ctx, f = mtof(note);
      const g = ctx.createGain();
      const peak = 0.055 * vel;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = f;
      const o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = f * 2;
      const g2 = ctx.createGain();
      g2.gain.value = 0.12;
      this.wowDepth.connect(o1.detune);
      this.wowDepth.connect(o2.detune);
      o1.connect(g);
      o2.connect(g2).connect(g);
      g.connect(this.keys);
      o1.start(t); o2.start(t);
      o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
      o1.onended = () => {
        try { this.wowDepth.disconnect(o1.detune); this.wowDepth.disconnect(o2.detune); } catch (e) { /* déjà déconnecté */ }
      };
    }

    _bass(note, t, dur, vel = 1) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = mtof(note);
      const o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = mtof(note);
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); o2.connect(g2).connect(g);
      g.connect(lp).connect(this.musicBus);
      o.start(t); o2.start(t);
      o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    }

    _kick(t) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(115, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      o.connect(g).connect(this.musicBus);
      o.start(t);
      o.stop(t + 0.4);
    }

    _snare(t) {
      const ctx = this.ctx;
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1700;
      bp.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      n.connect(bp).connect(g).connect(this.musicBus);
      n.start(t, Math.random());
      n.stop(t + 0.22);
    }

    _hat(t, vel) {
      const ctx = this.ctx;
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.022 * vel * (0.7 + Math.random() * 0.3), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      n.connect(hp).connect(g).connect(this.musicBus);
      n.start(t, Math.random());
      n.stop(t + 0.06);
    }

    _bell(note, t) {
      const ctx = this.ctx, f = mtof(note);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const mod = ctx.createOscillator();
      mod.frequency.value = f * 3.5;
      const modG = ctx.createGain();
      modG.gain.setValueAtTime(f * 0.6, t);
      modG.gain.exponentialRampToValueAtTime(1, t + 0.6);
      mod.connect(modG).connect(o.frequency);
      this.wowDepth.connect(o.detune);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g);
      g.connect(this.musicBus);
      g.connect(this.delay);
      o.start(t); mod.start(t);
      o.stop(t + 1.5); mod.stop(t + 1.5);
      o.onended = () => { try { this.wowDepth.disconnect(o.detune); } catch (e) { /* déjà déconnecté */ } };
    }

    // ---------------------------------------------------------- bruitages
    _ok() { return this.ctx && this.sfxOn; }

    _tone(type, f0, f1, t, dur, vol, out = this.sfxBus) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    _burst(t, freq, type, dur, vol) {
      const ctx = this.ctx;
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(f).connect(g).connect(this.sfxBus);
      n.start(t, Math.random());
      n.stop(t + dur + 0.02);
    }

    /** "Plop" quand on lâche une arme. */
    plop(level = 0) {
      if (!this._ok()) return;
      const t = this.ctx.currentTime;
      const base = 560 - level * 45 + Math.random() * 40;
      this._tone('sine', base * 1.5, base * 0.55, t, 0.16, 0.32);
      this._burst(t, 1400, 'bandpass', 0.03, 0.06);
    }

    /** Petit rebond mou quand une arme touche le tas. */
    land(strength = 0.5, level = 0) {
      if (!this._ok()) return;
      const t = this.ctx.currentTime;
      const f = 210 - level * 12;
      this._tone('sine', f, f * 0.6, t, 0.12, 0.06 + 0.12 * Math.min(1, strength));
    }

    /**
     * "Pop" pétillant de fusion — plus grave pour les grosses armes.
     * `combo` (1, 2, 3…) monte la fusion d'un demi-ton par étape de réaction en chaîne.
     */
    pop(level = 0, combo = 1) {
      if (!this._ok()) return;
      const t = this.ctx.currentTime;
      const semi = Math.pow(2, (combo - 1) / 12);
      const base = 820 * Math.pow(0.9, level) * semi;
      this._tone('sine', base * 0.6, base * 1.5, t, 0.14, 0.34);
      this._tone('triangle', base * 1.2, base * 2.2, t + 0.03, 0.1, 0.08);
      this._burst(t, 3200, 'highpass', 0.12, 0.07);
      const fizz = 6 + Math.min(level, 8);
      for (let i = 0; i < fizz; i++) {
        const tt = t + 0.02 + Math.random() * 0.2;
        const f = 1800 + Math.random() * 3200;
        this._tone('sine', f, f * 1.15, tt, 0.035, 0.035 + Math.random() * 0.03);
      }
      if (level >= 5) this._tone('sine', base * 0.35, base * 0.22, t, 0.35, 0.18);
      // Note musicale de la fusion : grave pour les grosses armes, +1 demi-ton par combo.
      const note = 81 - level + (combo - 1);
      this._tone('triangle', mtof(note), mtof(note), t + 0.04, 0.45, 0.07 + Math.min(0.05, (combo - 1) * 0.015));
      this._tone('sine', mtof(note + 12), mtof(note + 12), t + 0.04, 0.3, 0.03);
    }

    /** Échange swap : petit "whoosh" aller-retour. */
    swap() {
      if (!this._ok()) return;
      const t = this.ctx.currentTime;
      const n = this.ctx.createBufferSource();
      n.buffer = this.noise;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 2.5;
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.exponentialRampToValueAtTime(3500, t + 0.14);
      bp.frequency.exponentialRampToValueAtTime(700, t + 0.3);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      n.connect(bp).connect(g).connect(this.sfxBus);
      n.start(t, Math.random());
      n.stop(t + 0.35);
      this._tone('sine', 660, 990, t + 0.02, 0.1, 0.08);
      this._tone('sine', 990, 660, t + 0.16, 0.1, 0.08);
    }

    /** Explosion C4 : boum rond et étouffé, version cartoon. */
    boom() {
      if (!this._ok()) return;
      const t = this.ctx.currentTime;
      this._tone('sine', 140, 38, t, 0.6, 0.5);
      this._tone('triangle', 90, 45, t, 0.35, 0.2);
      const n = this.ctx.createBufferSource();
      n.buffer = this.noise;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400, t);
      lp.frequency.exponentialRampToValueAtTime(200, t + 0.6);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      n.connect(lp).connect(g).connect(this.sfxBus);
      n.start(t, Math.random());
      n.stop(t + 0.75);
      for (let i = 0; i < 8; i++) {
        const f = 1500 + Math.random() * 2500;
        this._tone('sine', f, f * 0.8, t + 0.08 + Math.random() * 0.3, 0.05, 0.03);
      }
    }

    /** Secousse : grondement doux. */
    rumble() {
      if (!this._ok()) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 5; i++) this._tone('sine', 70 + Math.random() * 30, 50, t + i * 0.08, 0.18, 0.18);
      this._burst(t, 300, 'lowpass', 0.5, 0.15);
    }

    /** Petit "bip" d'interface pour armer le C4. */
    arm() {
      if (!this._ok()) return;
      const t = this.ctx.currentTime;
      this._tone('square', 1200, 1200, t, 0.05, 0.04);
      this._tone('square', 1600, 1600, t + 0.08, 0.05, 0.04);
    }

    /** Jingle "nouvelle arme débloquée". */
    jingle() {
      if (!this._ok()) return;
      const t = this.ctx.currentTime + 0.05;
      [72, 76, 79, 84].forEach((n, i) => {
        this._tone('triangle', mtof(n), mtof(n), t + i * 0.085, i === 3 ? 0.6 : 0.2, 0.12);
        this._tone('sine', mtof(n + 12), mtof(n + 12), t + i * 0.085, i === 3 ? 0.5 : 0.15, 0.05);
      });
      for (let i = 0; i < 5; i++) {
        const f = mtof(96 + Math.floor(Math.random() * 8));
        this._tone('sine', f, f, t + 0.32 + i * 0.05, 0.08, 0.03);
      }
    }

    /** Fusion de deux Graals : fanfare. */
    fanfare() {
      if (!this._ok()) return;
      const t = this.ctx.currentTime + 0.05;
      [60, 64, 67, 72, 76, 79, 84].forEach((n, i) =>
        this._tone('triangle', mtof(n), mtof(n), t + i * 0.07, i === 6 ? 1.2 : 0.25, 0.12));
      [72, 76, 79].forEach(n => this._tone('sine', mtof(n), mtof(n), t + 0.5, 1.4, 0.06));
    }

    tick(final = false) {
      if (!this._ok()) return;
      const t = this.ctx.currentTime;
      const f = final ? 660 : 880;
      this._tone('sine', f, f, t, 0.12, 0.16);
    }

    gameOver() {
      if (!this._ok()) return;
      const t = this.ctx.currentTime + 0.05;
      [72, 67, 64, 60].forEach((n, i) => this._tone('triangle', mtof(n), mtof(n) * 0.98, t + i * 0.16, 0.3, 0.13));
    }

    click() {
      if (!this._ok()) return;
      this._tone('sine', 1300, 800, this.ctx.currentTime, 0.05, 0.1);
    }
  }

  window.GameAudio = new AudioEngine();
})();
