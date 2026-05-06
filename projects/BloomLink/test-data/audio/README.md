# Audio Fixtures

Place WebRTC test audio files in this directory. The Playwright meeting transcription test expects a WAV file named `conversation.wav` that contains the phrases:

- "Hello welcome to Bloomify meeting"
- "This is an automated transcription test"

The browser is launched with `--use-file-for-fake-audio-capture=./test-data/audio/conversation.wav`, so ensure that file exists before running the test suite.
