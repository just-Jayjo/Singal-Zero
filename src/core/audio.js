export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this._bgmBoost = null;
    this.bgmOscillators = null;
    this.bgmAudioEl = null;
    this.bgmFileSource = null;
  }

  _initContext() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.ctx.destination);
      this._bgmBoost = this.ctx.createGain();
      this._bgmBoost.gain.value = 1.8;
      this._bgmBoost.connect(this.masterGain);
      this.bgmOscillators = null;
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  resumeContext() {
    this._initContext();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx.state === 'running';
  }

  _ensureContext() {
    if (!this._initContext()) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  _createNoise(duration, gainValue = 0.3) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseGain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    noise.start();
    noise.stop(this.ctx.currentTime + duration);
    return noise;
  }

  _playTone(freq, duration, type = 'sine', gainValue = 0.3, freqEnd = null) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
    }
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainValue, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
    return { osc, gain };
  }

  playShoot() {
    if (!this._ensureContext()) return;
    this._playTone(800, 0.1, 'sine', 0.4, 200);
    this._createNoise(0.1, 0.3);
  }

  playRifleBurst() {
    if (!this._ensureContext()) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    const distortion = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(3 * x) / Math.tanh(3);
    }
    distortion.curve = curve;
    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.15);
    this._createNoise(0.15, 0.2);
  }

  playHitMarker() {
    if (!this._ensureContext()) return;
    this._playTone(1200, 0.05, 'sine', 0.5);
  }

  playReload() {
    if (!this._ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.18);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(200, t + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(60, t + 0.28);
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0, t + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, t + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.35);
    this._createNoise(0.15, 0.12);
  }

  playExplosion() {
    if (!this._ensureContext()) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(30, t + 0.45);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(2.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.5);

    const boom = this.ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(60, t);
    boom.frequency.exponentialRampToValueAtTime(15, t + 0.4);
    const boomG = this.ctx.createGain();
    boomG.gain.setValueAtTime(1.0, t);
    boomG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    boom.connect(boomG);
    boomG.connect(this.masterGain);
    boom.start(t);
    boom.stop(t + 0.4);
  }

  playDeath() {
    if (!this._ensureContext()) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(this.ctx.currentTime);
    noise.stop(this.ctx.currentTime + 0.3);
  }

  playDamage() {
    if (!this._ensureContext()) return;
    const hitGain = this.ctx.createGain();
    hitGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    hitGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    hitGain.connect(this.masterGain);
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, this.ctx.currentTime);
    lp.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.08);
    osc.connect(lp);
    lp.connect(hitGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playBGMLayer() {
    if (!this._ensureContext()) return null;
    this.stopBGM();

    const now = this.ctx.currentTime;
    this._bgmStop = false;

    /* Normal level BGM: Phonk + Sci-fi fusion, ~105 BPM, F#m (higher key) */
    const chords = [
      [92.50, 110.00, 138.59, 185.00],  /* F#m */
      [138.59, 185.00, 220.00, 277.18], /* D */
      [110.00, 138.59, 185.00, 220.00], /* Am */
      [123.47, 155.56, 185.00, 246.94], /* Bm */
    ];

    const masterG = this._bgmBoost;
    let chordIdx = 0;
    let beat = 0;

    /* Reverb/delay bus */
    const verbG = this.ctx.createGain();
    verbG.gain.setValueAtTime(0.4, now);
    const delay1 = this.ctx.createDelay(0.7);
    delay1.delayTime.setValueAtTime(0.38, now);
    const delayFeed1 = this.ctx.createGain();
    delayFeed1.gain.setValueAtTime(0.35, now);
    const delay2 = this.ctx.createDelay(0.45);
    delay2.delayTime.setValueAtTime(0.24, now);
    const delayFeed2 = this.ctx.createGain();
    delayFeed2.gain.setValueAtTime(0.25, now);
    verbG.connect(delay1);
    delay1.connect(delayFeed1);
    delayFeed1.connect(delay1);
    delayFeed1.connect(delay2);
    delay2.connect(delayFeed2);
    delayFeed2.connect(delay2);
    delayFeed2.connect(masterG);
    delayFeed1.connect(masterG);

    /* Organ pad */
    const organFil = this.ctx.createBiquadFilter();
    organFil.type = 'lowpass';
    organFil.frequency.setValueAtTime(350, now);
    organFil.Q.value = 1.2;
    const organGain = this.ctx.createGain();
    organGain.gain.setValueAtTime(0, now);
    organGain.gain.linearRampToValueAtTime(0.45, now + 6);
    organFil.connect(organGain);
    organGain.connect(masterG);
    organGain.connect(verbG);

    const organVoices = [];
    const organDefs = [
      { type: 'sawtooth', det: -24, gain: 0.12 },
      { type: 'sawtooth', det: -12, gain: 0.10 },
      { type: 'sawtooth', det: 0, gain: 0.10 },
      { type: 'triangle', det: 12, gain: 0.08 },
      { type: 'triangle', det: 24, gain: 0.06 },
      { type: 'sine', det: -5, gain: 0.04 },
      { type: 'sine', det: 5, gain: 0.04 },
    ];
    for (const v of organDefs) {
      const osc = this.ctx.createOscillator();
      osc.type = v.type;
      osc.detune.value = v.det;
      osc.frequency.setValueAtTime(92.50, now);
      const g = this.ctx.createGain();
      g.gain.value = v.gain;
      osc.connect(g);
      g.connect(organFil);
      osc.start();
      organVoices.push(osc);
    }
    const organLfo = this.ctx.createOscillator();
    organLfo.type = 'sine';
    organLfo.frequency.setValueAtTime(0.08, now);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(120, now);
    organLfo.connect(lfoGain);
    lfoGain.connect(organFil.frequency);
    organLfo.start();

    /* Sub-bass */
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.35, now + 4);
    subGain.connect(masterG);
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(46.25, now);
    subOsc.start();
    subOsc.connect(subGain);

    /* Kick */
    const _playKick = () => {
      const t = this.ctx.currentTime;
      const c = chords[chordIdx % chords.length];
      const click = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.003), this.ctx.sampleRate);
      const cd = click.getChannelData(0);
      for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * (1 - i / cd.length);
      const clickSrc = this.ctx.createBufferSource();
      clickSrc.buffer = click;
      const clickG = this.ctx.createGain();
      clickG.gain.setValueAtTime(0.8, t);
      clickG.gain.exponentialRampToValueAtTime(0.001, t + 0.003);
      clickSrc.connect(clickG);
      clickG.connect(masterG);
      clickSrc.start(t);
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(1.0, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g);
      g.connect(masterG);
      osc.start(t);
      osc.stop(t + 0.4);
      subOsc.frequency.setValueAtTime(c[0] / 2, t);
      subOsc.frequency.linearRampToValueAtTime(c[0] / 2 * 1.05, t + 0.12);
    };

    /* Snare */
    const _playSnare = () => {
      const t = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.45, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(280, t);
      bp.Q.value = 0.5;
      src.connect(bp);
      bp.connect(g);
      g.connect(masterG);
      g.connect(verbG);
      src.start(t);
      src.stop(t + 0.12);
      const tone = this.ctx.createOscillator();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(220, t);
      tone.frequency.exponentialRampToValueAtTime(110, t + 0.04);
      const tg = this.ctx.createGain();
      tg.gain.setValueAtTime(0.2, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      tone.connect(tg);
      tg.connect(masterG);
      tone.start(t);
      tone.stop(t + 0.06);
    };

    /* Cowbell */
    const _playCowbell = () => {
      const t = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(900, t);
      bp.Q.value = 3.0;
      src.connect(bp);
      bp.connect(g);
      g.connect(masterG);
      src.start(t);
      src.stop(t + 0.04);
    };

    /* Hi-hat */
    const _playHat = (open) => {
      const t = this.ctx.currentTime;
      const dur = open ? 0.12 : 0.035;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(open ? 0.18 : 0.10, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = open ? 2800 : 4500;
      src.connect(hp);
      hp.connect(g);
      g.connect(masterG);
      src.start(t);
      src.stop(t + dur);
    };

    /* Sci-fi arpeggio */
    const _playArp = () => {
      const t = this.ctx.currentTime;
      const c = chords[chordIdx % chords.length];
      const notes = [c[0], c[2], c[1], c[3]];
      const spacing = 0.18;
      for (let i = 0; i < 4; i++) {
        const nt = t + i * spacing;
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(notes[i], nt);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, nt);
        g.gain.linearRampToValueAtTime(0.08, nt + 0.003);
        g.gain.exponentialRampToValueAtTime(0.001, nt + 0.25);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2000, nt);
        osc.connect(lp);
        lp.connect(g);
        g.connect(masterG);
        g.connect(verbG);
        osc.start(nt);
        osc.stop(nt + 0.3);
      }
    };

    /* 808 bass slide */
    const _playBass = () => {
      const t = this.ctx.currentTime;
      const c = chords[chordIdx % chords.length];
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(c[0], t);
      osc.frequency.linearRampToValueAtTime(c[0] * 1.04, t + 0.08);
      osc.frequency.linearRampToValueAtTime(c[0] * 0.98, t + 0.25);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(400, t);
      lp.frequency.exponentialRampToValueAtTime(80, t + 0.25);
      lp.Q.value = 0.7;
      osc.connect(lp);
      lp.connect(g);
      g.connect(masterG);
      osc.start(t);
      osc.stop(t + 0.35);
    };

    /* Chord change */
    const _setChord = () => {
      const c = chords[chordIdx % chords.length];
      const t = this.ctx.currentTime;
      subOsc.frequency.setValueAtTime(c[0] / 2, t);
      for (const o of organVoices) {
        o.frequency.setValueAtTime(c[0], t);
      }
    };

    /* Sci-fi lead melody */
    const _playLead = () => {
      const t = this.ctx.currentTime;
      const melody = [369.99, 440.0, 554.37, 369.99, 329.63, 440.0];
      const spacing = 0.35;
      for (let i = 0; i < melody.length; i++) {
        const nt = t + i * spacing;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(melody[i], nt);
        const lfo2 = this.ctx.createOscillator();
        lfo2.type = 'sine';
        lfo2.frequency.setValueAtTime(6, nt);
        const lfoG2 = this.ctx.createGain();
        lfoG2.gain.setValueAtTime(5, nt);
        lfo2.connect(lfoG2);
        lfoG2.connect(osc.frequency);
        lfo2.start(nt);
        lfo2.stop(nt + 0.4);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, nt);
        g.gain.linearRampToValueAtTime(0.09, nt + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, nt + 0.5);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1500, nt);
        bp.Q.value = 0.8;
        osc.connect(bp);
        bp.connect(g);
        g.connect(masterG);
        g.connect(verbG);
        osc.start(nt);
        osc.stop(nt + 0.55);
      }
    };

    /* High chime */
    const _playChime = () => {
      const t = this.ctx.currentTime;
      const c = chords[chordIdx % chords.length];
      const harmonics = [c[3] * 2, c[3] * 2.5, c[3] * 3];
      for (let ci = 0; ci < 3; ci++) {
        const freq = harmonics[ci];
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + ci * 0.04);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t + ci * 0.04);
        g.gain.linearRampToValueAtTime(0.08, t + ci * 0.04 + 0.003);
        g.gain.exponentialRampToValueAtTime(0.001, t + ci * 0.04 + 0.4);
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(4000, t);
        osc.connect(hp);
        hp.connect(g);
        g.connect(verbG);
        osc.start(t + ci * 0.04);
        osc.stop(t + ci * 0.04 + 0.45);
      }
    };

    /* Sequencer */
    const stepMs = 286;
    this._seqInterval = setInterval(() => {
      if (this._bgmStop) return;
      const b = beat % 16;

      if (b % 4 === 0) _playKick();
      if (b % 4 === 2) _playSnare();
      if (b % 2 === 1) _playHat(false);
      if (b === 2 || b === 6 || b === 10 || b === 14) _playCowbell();
      if (b === 7 || b === 15) _playHat(true);
      if (b % 4 === 0) _playBass();
      if (b === 12) _playArp();
      if (b === 0) _playLead();
      if (b === 8) _playChime();
      if (b === 0) {
        _setChord();
        if (beat > 0) chordIdx = (chordIdx + 1) % chords.length;
      }
      beat++;
    }, stepMs);

    this._bgmNodes = [subGain, subOsc, organFil, organGain, ...organVoices, organLfo, lfoGain,
      verbG, delay1, delayFeed1, delay2, delayFeed2];
    return () => { this.stopBGM(); };
  }

  /* ── Final boss BGM: darker, more aggressive, ~120 BPM ── */
  playBossBGMLayer() {
    if (!this._ensureContext()) return null;
    this.stopBGM();

    const now = this.ctx.currentTime;
    this._bgmStop = false;

    const chords = [
      [92.50, 110.00, 138.59, 185.00],  /* F#m */
      [123.47, 155.56, 185.00, 246.94], /* Bm */
      [92.50, 110.00, 138.59, 185.00],  /* F#m */
      [138.59, 185.00, 220.00, 277.18], /* D */
    ];

    const masterG = this._bgmBoost;
    let chordIdx = 0;
    let beat = 0;

    /* Less reverb, more distortion */
    const verbG = this.ctx.createGain();
    verbG.gain.setValueAtTime(0.2, now);
    const delay1 = this.ctx.createDelay(0.5);
    delay1.delayTime.setValueAtTime(0.25, now);
    const delayFeed1 = this.ctx.createGain();
    delayFeed1.gain.setValueAtTime(0.2, now);
    verbG.connect(delay1);
    delay1.connect(delayFeed1);
    delayFeed1.connect(delay1);
    delayFeed1.connect(masterG);

    /* Distortion bus */
    const distG = this.ctx.createGain();
    distG.gain.setValueAtTime(0.7, now);
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(5 * x) / Math.tanh(5);
    }
    shaper.curve = curve;
    distG.connect(shaper);
    shaper.connect(masterG);

    /* Dark pad (less warm, more aggressive) */
    const padFil = this.ctx.createBiquadFilter();
    padFil.type = 'lowpass';
    padFil.frequency.setValueAtTime(250, now);
    padFil.Q.value = 2.0;
    const padGain = this.ctx.createGain();
    padGain.gain.setValueAtTime(0, now);
    padGain.gain.linearRampToValueAtTime(0.35, now + 4);
    padFil.connect(padGain);
    padGain.connect(masterG);
    padGain.connect(verbG);

    const padOscs = [];
    const padDefs = [
      { type: 'sawtooth', det: -12, gain: 0.10 },
      { type: 'sawtooth', det: 0, gain: 0.08 },
      { type: 'square', det: 7, gain: 0.04 },
    ];
    for (const v of padDefs) {
      const osc = this.ctx.createOscillator();
      osc.type = v.type;
      osc.detune.value = v.det;
      osc.frequency.setValueAtTime(92.50, now);
      const g = this.ctx.createGain();
      g.gain.value = v.gain;
      osc.connect(g);
      g.connect(padFil);
      osc.start();
      padOscs.push(osc);
    }

    /* Distorted bass */
    const bassG = this.ctx.createGain();
    bassG.gain.setValueAtTime(0, now);
    bassG.gain.linearRampToValueAtTime(0.4, now + 4);
    bassG.connect(distG);
    const bassOsc = this.ctx.createOscillator();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(46.25, now);
    bassOsc.start();
    bassOsc.connect(bassG);

    /* Sub */
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.4, now + 4);
    subGain.connect(masterG);
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(46.25, now);
    subOsc.start();
    subOsc.connect(subGain);

    /* Aggressive kick (double-kick pattern) */
    const _playKick = () => {
      const t = this.ctx.currentTime;
      const c = chords[chordIdx % chords.length];
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(1.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(masterG);
      osc.start(t);
      osc.stop(t + 0.35);
      subOsc.frequency.setValueAtTime(c[0] / 2, t);
    };

    /* Snare (dry, aggressive) */
    const _playSnare = () => {
      const t = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.1), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(350, t);
      bp.Q.value = 0.3;
      src.connect(bp);
      bp.connect(g);
      g.connect(masterG);
      src.start(t);
      src.stop(t + 0.1);
    };

    /* Hi-hat (faster) */
    const _playHat = (open) => {
      const t = this.ctx.currentTime;
      const dur = open ? 0.06 : 0.025;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(open ? 0.12 : 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5000;
      src.connect(hp);
      hp.connect(g);
      g.connect(masterG);
      src.start(t);
      src.stop(t + dur);
    };

    /* Boss lead melody (aggressive, square wave) */
    const _playLead = () => {
      const t = this.ctx.currentTime;
      const melody = [369.99, 440.0, 277.18, 329.63, 440.0, 554.37, 493.88, 369.99];
      const spacing = 0.25;
      for (let i = 0; i < melody.length; i++) {
        const nt = t + i * spacing;
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(melody[i], nt);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, nt);
        g.gain.linearRampToValueAtTime(0.07, nt + 0.003);
        g.gain.exponentialRampToValueAtTime(0.001, nt + 0.2);
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(2000, nt);
        osc.connect(hp);
        hp.connect(g);
        g.connect(masterG);
        g.connect(verbG);
        osc.start(nt);
        osc.stop(nt + 0.25);
      }
    };

    /* Chord change */
    const _setChord = () => {
      const c = chords[chordIdx % chords.length];
      const t = this.ctx.currentTime;
      bassOsc.frequency.setValueAtTime(c[0], t);
      subOsc.frequency.setValueAtTime(c[0] / 2, t);
      for (const o of padOscs) {
        o.frequency.setValueAtTime(c[0], t);
      }
    };

    /* Sequencer (1/8th, ~120 BPM) */
    const stepMs = 250;
    this._seqInterval = setInterval(() => {
      if (this._bgmStop) return;
      const b = beat % 16;

      if (b % 4 === 0) _playKick();
      if (b % 4 === 2) _playKick(); /* double kick */
      if (b % 4 === 3) _playSnare();
      if (b % 2 === 1) _playHat(false);
      if (b === 7 || b === 15) _playHat(true);
      if (b === 0) _playLead();
      if (b === 0) {
        _setChord();
        if (beat > 0) chordIdx = (chordIdx + 1) % chords.length;
      }
      beat++;
    }, stepMs);

    this._bgmNodes = [subGain, subOsc, padFil, padGain, ...padOscs, bassG, bassOsc, distG, shaper,
      verbG, delay1, delayFeed1];
    return () => { this.stopBGM(); };
  }

  playBGMFile(filename, fallback) {
    if (!this._ensureContext()) return
    this.stopBGM()
    const tryPlay = (retries = 2) => {
      try {
        const audioEl = new Audio(filename || './audio/bgm_industrial.mp3')
        audioEl.loop = true
        audioEl.volume = 1.0
        audioEl.crossOrigin = 'anonymous'
        const source = this.ctx.createMediaElementSource(audioEl)
        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(1.0, this.ctx.currentTime)
        source.connect(gain)
        gain.connect(this._bgmBoost)
        const playPromise = audioEl.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (retries > 0) {
              setTimeout(() => tryPlay(retries - 1), 500)
            } else if (fallback) {
              fallback()
            }
          })
        }
        this.bgmAudioEl = audioEl
        this.bgmFileSource = { source, gain }
      } catch (e) {
        if (retries > 0) {
          setTimeout(() => tryPlay(retries - 1), 500)
        } else if (fallback) {
          console.warn('BGM file playback failed, using synth:', e)
          fallback()
        }
      }
    }
    tryPlay()
  }

  playEndingBGM() {
    if (!this._ensureContext()) return
    this.stopBGM()
    const now = this.ctx.currentTime
    this._bgmStop = false

    const masterG = this.ctx.createGain()
    masterG.gain.setValueAtTime(0, now)
    masterG.gain.linearRampToValueAtTime(0.7, now + 3)
    masterG.connect(this._bgmBoost)

    const chordProg = [
      [65.41, 77.78, 92.50],
      [55.00, 65.41, 77.78],
      [73.42, 87.31, 103.83],
      [61.74, 73.42, 87.31]
    ]
    let chordIdx = 0

    const padFil = this.ctx.createBiquadFilter()
    padFil.type = 'lowpass'
    padFil.frequency.setValueAtTime(200, now)
    padFil.frequency.linearRampToValueAtTime(500, now + 12)
    padFil.Q.value = 1.5
    const padG = this.ctx.createGain()
    padG.gain.setValueAtTime(0.4, now)
    padG.connect(masterG)
    padFil.connect(padG)

    const padOscs = []
    const padNotes = [65.41, 77.78, 92.50, 110.00]
    for (const f of padNotes) {
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, now)
      const g = this.ctx.createGain()
      g.gain.value = 0.06
      osc.connect(g)
      g.connect(padFil)
      osc.start()
      padOscs.push(osc)
    }

    const bassG = this.ctx.createGain()
    bassG.gain.setValueAtTime(0, now)
    bassG.gain.linearRampToValueAtTime(0.5, now + 1)
    bassG.connect(masterG)
    const bassOsc = this.ctx.createOscillator()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(55, now)
    bassOsc.connect(bassG)
    bassOsc.start()

    const arpG = this.ctx.createGain()
    arpG.gain.setValueAtTime(0, now)
    arpG.gain.linearRampToValueAtTime(0.15, now + 5)
    arpG.connect(masterG)
    const arpFil = this.ctx.createBiquadFilter()
    arpFil.type = 'lowpass'
    arpFil.frequency.setValueAtTime(800, now)
    arpFil.frequency.linearRampToValueAtTime(300, now + 12)
    arpFil.connect(arpG)

    const _arp = () => {
      if (this._bgmStop) return
      const t = this.ctx.currentTime
      const c = chordProg[chordIdx % chordProg.length]
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(c[i % 3] * (1 + (i >= 3 ? 2 : 0)), t + i * 0.12)
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0, t + i * 0.12)
        g.gain.linearRampToValueAtTime(0.06, t + i * 0.12 + 0.01)
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.35)
        osc.connect(g)
        g.connect(arpFil)
        osc.start(t + i * 0.12)
        osc.stop(t + i * 0.12 + 0.35)
      }
      chordIdx++
    }

    this._seqInterval = setInterval(() => {
      if (this._bgmStop) return
      _arp()
    }, 1600)

    const noiseG = this.ctx.createGain()
    noiseG.gain.setValueAtTime(0, now)
    noiseG.gain.linearRampToValueAtTime(0.06, now + 6)
    noiseG.gain.exponentialRampToValueAtTime(0.001, now + 14)
    noiseG.connect(masterG)
    const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 14), this.ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
    const noiseSrc = this.ctx.createBufferSource()
    noiseSrc.buffer = noiseBuf
    const noiseFil = this.ctx.createBiquadFilter()
    noiseFil.type = 'lowpass'
    noiseFil.frequency.setValueAtTime(400, now)
    noiseFil.frequency.exponentialRampToValueAtTime(60, now + 14)
    noiseSrc.connect(noiseFil)
    noiseFil.connect(noiseG)
    noiseSrc.start(now)
    noiseSrc.stop(now + 14)

    this._bgmNodes = [masterG, padG, padFil, ...padOscs, bassG, bassOsc, arpG, arpFil, noiseG, noiseFil, noiseSrc]
  }

  playSFX(type) {
    if (!this._initContext()) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const dest = this.masterGain || ctx.destination

    if (type === 'bossGrowl') {
      const dur = 0.5
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(200, now)
      filter.frequency.exponentialRampToValueAtTime(80, now + dur)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(80, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + dur)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
      osc.connect(filter); filter.connect(gain); gain.connect(dest)
      osc.start(now); osc.stop(now + dur)
    }

    if (type === 'bossRoar') {
      const dur = 0.8
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(400, now)
      filter.frequency.exponentialRampToValueAtTime(60, now + dur)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(30, now + dur)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.setValueAtTime(0.25, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
      osc.connect(filter); filter.connect(gain); gain.connect(dest)
      osc.start(now); osc.stop(now + dur)
      const noiseDur = 0.3
      const bufferSize = Math.floor(ctx.sampleRate * noiseDur)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      const nGain = ctx.createGain()
      nGain.gain.setValueAtTime(0.08, now + 0.2)
      nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur + 0.2)
      noise.connect(nGain); nGain.connect(dest)
      noise.start(now + 0.2); noise.stop(now + 0.2 + noiseDur)
    }

    if (type === 'bossPulse') {
      const dur = 0.15
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.2
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(100 + i * 50, t)
        osc.frequency.exponentialRampToValueAtTime(200 + i * 80, t + dur)
        gain.gain.setValueAtTime(0.12, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
        osc.connect(gain); gain.connect(dest)
        osc.start(t); osc.stop(t + dur)
      }
    }
  }

  stopBGM() {
    this._bgmStop = true;
    if (this._bgmInterval) {
      clearInterval(this._bgmInterval);
      this._bgmInterval = null;
    }
    if (this._seqInterval) {
      clearInterval(this._seqInterval);
      this._seqInterval = null;
    }
    if (this.bgmAudioEl) {
      this.bgmAudioEl.pause()
      this.bgmAudioEl = null
      this.bgmFileSource = null
    }
    if (!this.ctx || !this._bgmNodes) return;
    const now = this.ctx.currentTime;
    for (const node of this._bgmNodes) {
      if (node instanceof AudioNode && node.stop) {
        try { node.stop(now + 0.5); } catch {}
      }
      if (node instanceof GainNode) {
        try { node.gain.setValueAtTime(0, now + 0.4); } catch {}
      }
    }
    this._bgmNodes = null;
  }
}
