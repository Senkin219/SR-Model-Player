import { Howl } from "howler";

export default class AudioManager {
  constructor(options = {}) {
    const { list = [], currentPlayId, muted = false } = options;

    this.sounds = {};
    this.currentPlayId = currentPlayId;
    this.muted = muted;
    this.spriteMap = {};
    list.forEach((sound) => this.addSound(sound));
    this.initBrowserVisibleEvent();
    this.initClickHtml5AudioPlay();
    this.setCurrentPlayAudio();
  }

  static getSpriteId(sound, spriteId) {
    return (sound._sounds.find((item) => item._sprite === spriteId) || {})._id;
  }

  addSound(soundSetting) {
    const {
      id,
      src,
      volume = 1,
      html5 = false,
      loop = false,
      preload = true,
      autoplay = false,
      rate = 1,
      fade = 0,
      overwrite = true,
      sprite = {},
    } = soundSetting;

    if (!overwrite && this.sounds[id]) return;
    const sound = new Howl({
      src,
      volume,
      html5,
      loop,
      preload,
      autoplay,
      rate,
      sprite,
    });
    sound._id = id;
    sound._initVolume = volume;
    sound._initFade = fade;
    this.sounds[id] = sound;
    if (this.muted) sound.mute(true);
    Object.keys(sprite).forEach((spriteId) => {
      this.spriteMap[spriteId] = id;
    });
  }

  setMuted(muted) {
    if (muted) this.setAllMute();
    else this.resumeAllMute();
  }

  setAllMute() {
    if (this.muted) return;
    this.muted = true;
    this.soundList.forEach((sound) => sound.mute(true));
  }

  resumeAllMute() {
    if (!this.muted) return;
    this.muted = false;
    this.soundList.forEach((sound) => sound.mute(false));
  }

  setCurrentPlayAudio(id) {
    if (!this.sounds[id]) return;
    if (this.currentPlayAudio) this.currentPlayAudio.stop();
    this.currentPlayId = id;
    this.playSound(this.currentPlayAudio._id);
  }

  initClickHtml5AudioPlay() {
    if (!this.currentPlayAudio || this.currentPlayAudio.playing()) return;
    const playOnClick = () => {
      window.requestAnimationFrame(() => {
        this.playSound(this.currentPlayAudio._id);
      });
      window.removeEventListener("click", playOnClick, true);
    };
    window.addEventListener("click", playOnClick, true);
  }

  initBrowserVisibleEvent() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.resumeAll();
      else this.pauseAll();
    });
  }

  playSound(id) {
    const sound = this.sounds[id] || (this.spriteMap[id] && this.sounds[this.spriteMap[id]]);
    const isSprite = !this.sounds[id] && this.spriteMap[id];
    if (!sound) return null;

    const play = () => {
      const playId = isSprite ? sound.play(id) : sound.play();
      if (!this.muted && sound._initFade) {
        sound.fade(0, sound._initVolume, sound._initFade, playId);
      }
      sound.once(
        "fade",
        () => {
          sound._volume = sound._initVolume;
        },
        playId,
      );
    };

    if (sound.state() === "loaded") play();
    else {
      sound.once("load", play);
      sound.load();
    }
    return sound;
  }

  pauseSound(id, fade = false) {
    const sound = this.sounds[id] || (this.spriteMap[id] && this.sounds[this.spriteMap[id]]);
    if (!sound) return undefined;
    const playId = AudioManager.getSpriteId(sound, id);
    if (fade) {
      sound.fade(sound._volume, 0, sound._initFade, playId);
      sound.once("fade", () => sound.pause(playId), playId);
    } else {
      sound.pause(playId);
    }
    return sound;
  }

  stopSound(id, fade = false) {
    const sound = this.sounds[id] || (this.spriteMap[id] && this.sounds[this.spriteMap[id]]);
    if (!sound) return undefined;
    const playId = AudioManager.getSpriteId(sound, id);
    sound.off("load");
    if (fade) {
      sound.fade(sound._volume, 0, sound._initFade, playId);
      sound.once("fade", () => sound.stop(playId), playId);
    } else {
      sound.stop(playId);
    }
    return sound;
  }

  pauseAll() {
    this.soundList.forEach((sound) => {
      if (sound.playing()) {
        sound.needResume = true;
        this.pauseSound(sound._id);
      }
    });
  }

  resumeAll() {
    this.soundList.forEach((sound) => {
      if (sound.needResume) {
        sound.needResume = false;
        this.playSound(sound._id);
      }
    });
  }

  get currentPlayAudio() {
    return this.sounds[this.currentPlayId];
  }

  get soundList() {
    return Object.keys(this.sounds).map((id) => this.sounds[id]);
  }
}
