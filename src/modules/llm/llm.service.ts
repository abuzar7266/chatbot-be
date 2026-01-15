import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class LlmService {
  private samples: string[] = [
    `I have processed your message: "{prompt}". This is a simulated streaming reply meant to mimic how an AI would gradually generate tokens in response to your prompt.`,
    `Here is a concise explanation based on your message: "{prompt}". In this simulated environment, the response is streamed word by word so you can integrate it with a chat UI.`,
    `Your prompt was: "{prompt}". I am sending this response in small chunks to demonstrate how a real LLM streaming API might behave in production.`,
    `Thanks for the message: "{prompt}". Imagine these chunks as tokens arriving from a large language model over a persistent connection.`,
    `You wrote: "{prompt}". This simulated answer is broken into multiple pieces so that your frontend can render partial completions as they arrive.`,
    `Prompt detected: "{prompt}". The following text is a mock AI reply, streamed incrementally to test your SSE integration and client-side handling.`,
    `I received the following input: "{prompt}". In a real system, these chunks could correspond to sentences, phrases, or tokens from an LLM.`,
    `Processing: "{prompt}". This is a mock response that helps you verify how your backend and frontend work together when dealing with streaming outputs.`,
    `Your input "{prompt}" has been acknowledged. The response is being emitted chunk by chunk so you can observe the sequence of streaming events.`,
    `You asked about: "{prompt}". This simulated reply is intentionally verbose and streamed slowly to give you time to handle each piece on the client side.`,
    `Message received: "{prompt}". Consider this a placeholder for an actual AI completion, delivered in multiple parts via server-sent events.`,
    `Working with prompt: "{prompt}". The goal of this mocked streaming response is to help you test ordering, message IDs, and UI updates.`
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

    const base =
      this.samples[Math.floor(Math.random() * this.samples.length)] ||
      `I received your message: "{prompt}". This is a default simulated streaming response.`;

    const fullResponse = base.replace('{prompt}', prompt);
    
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
     await new Promise((resolve) => setTimeout(resolve, delay));
 
     // Return a hardcoded response
     const base =
       this.samples[Math.floor(Math.random() * this.samples.length)] ||
       `I received your message: "{prompt}". This is a default simulated response after a delay of ${delay / 1000} seconds.`;

     return base.replace('{prompt}', prompt);
  }
}
