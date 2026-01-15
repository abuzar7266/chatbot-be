import { Injectable } from '@nestjs/common';

@Injectable()
export class LlmService {
  /**
   * Simulates an LLM response with a random delay between 10 and 20 seconds.
   * @param prompt The user's input prompt
   * @returns A simulated AI response
   */
  async generateResponse(prompt: string): Promise<string> {
    // Calculate a random delay between 10,000ms (10s) and 20,000ms (20s)
    const delay = Math.floor(Math.random() * (20000 - 10000 + 1) + 10000);

    // Simulate network/processing delay (non-blocking)
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Return a hardcoded response
    return `[Simulated AI Response] I received your message: "${prompt}". This is a simulated response generated after a delay of ${delay / 1000} seconds. In a real application, this would be connected to an LLM API like OpenAI or Anthropic.`;
  }
}
