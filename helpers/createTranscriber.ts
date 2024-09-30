import { RealtimeTranscriber, RealtimeTranscript } from 'assemblyai';
import { getAssemblyToken } from './getAssemblyToken';
import { Dispatch, SetStateAction } from 'react';

export async function createTranscriber(
  setTranscribedText: Dispatch<SetStateAction<string>>,
  setLlamaActive: Dispatch<SetStateAction<boolean>>,
  processPrompt: (prompt: string) => void
): Promise<RealtimeTranscriber | undefined> {
  const token = await getAssemblyToken();
  console.log('Assembly token: ', token);
  if (!token) {
    console.error('No token found');
    return;
  }

  const transcriber = new RealtimeTranscriber({
    sampleRate: 16_000,
    token: token,
    wordBoost: ['Llama'],
    endUtteranceSilenceThreshold: 1000,
    // encoding: 'pcm_mulaw', // Uncomment if needed
  });

  let combinedText = ''; // Used to accumulate text from partial transcripts

  transcriber.on('open', ({ sessionId }) => {
    console.log(`Transcriber opened with session ID: ${sessionId}`);
  });

  transcriber.on('error', (error: Error) => {
    console.error('Transcriber error:', error);
    // Consider handling closure here for better error management
  });

  transcriber.on('close', (code: number, reason: string) => {
    console.log(`Transcriber closed with code ${code} and reason: ${reason}`);
    // Clean-up logic can be placed here
  });

  transcriber.on('transcript', (transcript: RealtimeTranscript) => {
    if (!transcript.text) {
      return; // Skip empty transcripts
    }

    // Detect "llama" in the transcript to toggle LLM active state
    setLlamaActive(transcript.text.toLowerCase().includes('llama'));

    if (transcript.message_type === 'PartialTranscript') {
      combinedText += transcript.text + ' '; // Concatenate with a space for readability
      console.log('[Transcript] Partial:', combinedText); // Optionally, log the partial combined text
    } else {
      // For final transcripts, we combine any remaining partial transcript.
      combinedText += transcript.text + ' ';
      console.log('[Transcript] Final:', combinedText); // Log the final combined text

      setTranscribedText(combinedText); // Update state with the final combined text

      // If "llama" is mentioned, process the combined text as a prompt
      if (combinedText.toLowerCase().includes('llama')) {
        console.log('Processing prompt:', combinedText);
        processPrompt(combinedText);
      }

      combinedText = ''; // Reset combined text for the next series of transcripts
    }
  });

  return transcriber;
}