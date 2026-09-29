const NOTES_IN_HZ = [880, 1320] as const;
const NOTE_DURATION_IN_SECONDS = 0.18;
const NOTE_VOLUME = 0.2;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

export function playNewTicketSound(): void {
  const context = getAudioContext();
  if (context.state === "suspended") void context.resume();

  NOTES_IN_HZ.forEach((frequency, noteIndex) => {
    const startAt = context.currentTime + noteIndex * NOTE_DURATION_IN_SECONDS;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(NOTE_VOLUME, startAt);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      startAt + NOTE_DURATION_IN_SECONDS,
    );

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + NOTE_DURATION_IN_SECONDS);
  });
}
