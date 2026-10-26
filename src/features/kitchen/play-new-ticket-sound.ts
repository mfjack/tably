const NOTES_IN_HZ = [880, 1320] as const;
const NOTE_DURATION_IN_SECONDS = 0.18;
const NOTE_VOLUME = 1;
const CHIME_REPETITIONS = 2;
const PAUSE_BETWEEN_CHIMES_IN_SECONDS = 0.15;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

function playNote(
  context: AudioContext,
  frequency: number,
  startAt: number,
): void {
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
}

export function playNewTicketSound(): void {
  const context = getAudioContext();
  if (context.state === "suspended") void context.resume();

  const chimeDuration =
    NOTES_IN_HZ.length * NOTE_DURATION_IN_SECONDS +
    PAUSE_BETWEEN_CHIMES_IN_SECONDS;

  for (let chimeIndex = 0; chimeIndex < CHIME_REPETITIONS; chimeIndex += 1) {
    NOTES_IN_HZ.forEach((frequency, noteIndex) => {
      playNote(
        context,
        frequency,
        context.currentTime +
          chimeIndex * chimeDuration +
          noteIndex * NOTE_DURATION_IN_SECONDS,
      );
    });
  }
}
