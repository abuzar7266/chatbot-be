import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

type LlmSample = {
  topic: string;
  text: string;
};

@Injectable()
export class LlmService {
  private samples: LlmSample[] = [
    {
      topic: 'Streaming behavior overview',
      text: 'This is a simulated streaming reply intended to mimic how an AI gradually generates tokens over time.',
    },
    {
      topic: 'Streaming chunks in chat UI',
      text: 'Here is a concise explanation delivered as a series of small chunks to demonstrate streaming behavior in your chat UI.',
    },
    {
      topic: 'Incremental updates handling',
      text: 'This response is being sent piece by piece so you can verify that your frontend correctly handles incremental updates.',
    },
    {
      topic: 'Tokens over persistent connections',
      text: 'Imagine these chunks as tokens arriving from a large language model through a persistent connection.',
    },
    {
      topic: 'Rendering partial completions',
      text: 'This simulated answer is broken into multiple parts so that you can render partial completions as they arrive.',
    },
    {
      topic: 'Exercising SSE integration',
      text: 'The following text is a mock AI reply, streamed incrementally to exercise your SSE integration and client-side buffering logic.',
    },
    {
      topic: 'Real model tokenisation analogy',
      text: 'These chunks could represent sentences, phrases, or tokens produced by a real language model in production.',
    },
    {
      topic: 'Backend–frontend coordination',
      text: 'This mock response is designed to help you validate how your backend and frontend coordinate around streaming outputs.',
    },
    {
      topic: 'Ordering and timing observation',
      text: 'The text you are reading is emitted chunk by chunk so you can observe ordering, timing, and message boundaries.',
    },
    {
      topic: 'Slow verbose reply for UI testing',
      text: 'This simulated reply is intentionally verbose and streamed slowly to give your UI time to react to each new piece of content.',
    },
    {
      topic: 'Placeholder completion over SSE',
      text: 'Consider this a placeholder for an actual AI completion, delivered in multiple parts via server-sent events.',
    },
    {
      topic: 'Testing sequencing and buffering',
      text: 'The goal of this mocked streaming response is to help you test message sequencing, IDs, and UI updates without calling a real LLM.',
    },
  ];
  private pickSample(): LlmSample {
    const index = Math.floor(Math.random() * this.samples.length);
    return (
      this.samples[index] || {
        topic: 'Default streaming response',
        text: 'This is a default simulated streaming response emitted as a sequence of small chunks.',
      }
    );
  }

  generateResponseStream(
    prompt: string,
    onSampleChosen?: (sample: LlmSample) => void,
  ): Observable<string> {
    const subject = new Subject<string>();

    const initialDelay = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000);

    const sample = this.pickSample();
    if (onSampleChosen) {
      onSampleChosen(sample);
    }

    const fullResponse = `${sample.text} (responding to your prompt: "${prompt}")`;

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

  async generateResponse(prompt: string): Promise<string> {
    const delay = Math.floor(Math.random() * (20000 - 10000 + 1) + 10000);

    await new Promise(resolve => setTimeout(resolve, delay));

    const sample = this.pickSample();
    const base =
      sample.text ||
      `This is a default simulated response generated after a delay of ${delay / 1000} seconds.`;
    return `${base} (responding to your prompt: "${prompt}")`;
  }
}
