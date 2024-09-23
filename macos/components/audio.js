/**
 * @class PlayAudio
 * Handles audio playback for the system
 */
export class AudioPlayer {
  constructor(name) {
    this.audio = new Audio(name);
    this.audio.addEventListener('ended', () => {
      delete this;
    });
    this.audio.play();
  }

  /**
   * @static Play an audio file from the /audio directory
   * @param {string} name The name of the audio file to play. 
   */
  static play(name) {
    new AudioPlayer('audio/' + name + '.mp3');
  }
}

globalThis.AudioPlayer = AudioPlayer;