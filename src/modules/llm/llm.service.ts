import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class LlmService {
  private samples: string[] = [
    'This is a simulated streaming reply intended to mimic how an AI gradually generates tokens over time.',
    'Here is a concise explanation delivered as a series of small chunks to demonstrate streaming behavior in your chat UI.',
    'This response is being sent piece by piece so you can verify that your frontend correctly handles incremental updates.',
    'Imagine these chunks as tokens arriving from a large language model through a persistent connection.',
    'This simulated answer is broken into multiple parts so that you can render partial completions as they arrive.',
    'The following text is a mock AI reply, streamed incrementally to exercise your SSE integration and client-side buffering logic.',
    'These chunks could represent sentences, phrases, or tokens produced by a real language model in production.',
    'This mock response is designed to help you validate how your backend and frontend coordinate around streaming outputs.',
    'The text you are reading is emitted chunk by chunk so you can observe ordering, timing, and message boundaries.',
    'This simulated reply is intentionally verbose and streamed slowly to give your UI time to react to each new piece of content.',
    'Consider this a placeholder for an actual AI completion, delivered in multiple parts via server-sent events.',
    'The goal of this mocked streaming response is to help you test message sequencing, IDs, and UI updates without calling a real LLM.',
  ];
  /**
   * Simulates an LLM response stream with chunks.
   * @param prompt The user's input prompt
   * @returns An Observable that emits chunks of text
   */
  generateResponseStream(prompt: string): Observable<string> {
    const subject = new Subject<string>();

    // Calculate a random initial delay (processing time) between 1s and 3s
    // (Reduced for better UX in streaming, but overall duration will still be significant)
    const initialDelay = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000);

    const baseSample =
      this.samples[Math.floor(Math.random() * this.samples.length)] ||
      'This is a default simulated streaming response emitted as a sequence of small chunks.';

    const fullResponse = `${baseSample} (responding to your prompt: "${prompt}")`;

    const chunks = fullResponse.split(' ');
    let currentIndex = 0;

    setTimeout(() => {
      const interval = setInterval(() => {
        if (currentIndex >= chunks.length) {
          clearInterval(interval);
          subject.complete();
          return;
        }

        // Emit next word/chunk with a space
        const chunk = chunks[currentIndex] + (currentIndex < chunks.length - 1 ? ' ' : '');
        subject.next(chunk);
        currentIndex++;
      }, 300); // Emit a chunk every 300ms
    }, initialDelay);

    return subject.asObservable();
  }

  /**
   * Legacy one-shot response method (kept for backward compatibility if needed)
   */
  async generateResponse(prompt: string): Promise<string> {
    // Calculate a random delay between 10,000ms (10s) and 20,000ms (20s)
    const delay = Math.floor(Math.random() * (20000 - 10000 + 1) + 10000);

    // Simulate network/processing delay (non-blocking)
    await new Promise(resolve => setTimeout(resolve, delay));

    const base =
      this.samples[Math.floor(Math.random() * this.samples.length)] ||
      `This is a default simulated response generated after a delay of ${delay / 1000} seconds.`;
    return `${base} (responding to your prompt: "${prompt}")`;
  }
}
