import fs from 'fs';
import path from 'path';
import say from 'say';

const OUTPUT_PATH = path.resolve(process.cwd(), 'projects/BloomLink/test-data/audio/conversation.wav');
const OUTPUT_DIR = path.dirname(OUTPUT_PATH);

const baseSentences = [
  'Hello welcome to Bloomify meeting where innovation meets care.',
  'This is an automated transcription test intended for validating our WebRTC workflow.',
  'We are sharing updates about the BloomLink roadmap, accessibility improvements, and partner feedback.',
  'During this simulated call we review channel performance metrics, customer success stories, and release timelines.',
  'Quality automation helps every caregiver focus on meaningful conversations rather than repetitive tasks.',
  'Bloomify assistants collaborate with clinicians, educators, and analysts across multiple regions.',
  'Our team continuously refines conversational intelligence, compliance safeguards, and privacy defaults.',
  'Thank you for participating in this long form narration that powers secure testing across devices.',
  'Please ensure microphone consent, video readiness, and meeting etiquette for every virtual session.',
  'Together we create compassionate experiences with reliable technology and thoughtful storytelling.',
];

function buildNarration(targetWordCount = 1000) {
  const sentences = [];
  let wordCount = 0;

  while (wordCount < targetWordCount) {
    for (const sentence of baseSentences) {
      sentences.push(sentence);
      wordCount += sentence.split(/\s+/).length;
      if (wordCount >= targetWordCount) {
        break;
      }
    }
  }

  return sentences.join(' ');
}

async function ensureOutputDir() {
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
}

function exportAudio(text) {
  return new Promise((resolve, reject) => {
    say.export(text, undefined, 1.0, OUTPUT_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function main() {
  const narration = buildNarration();
  const totalWords = narration.split(/\s+/).length;

  console.log(`Generating narration with ${totalWords} words...`);
  await ensureOutputDir();

  try {
    await exportAudio(narration);
    console.log(`Audio file created at ${OUTPUT_PATH}`);
    console.log('You can now run the meeting transcription test.');
  } catch (error) {
    console.error('Failed to generate audio:', error);
    process.exitCode = 1;
  }
}

main();
