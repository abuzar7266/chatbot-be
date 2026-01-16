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
      topic: 'Understanding this ChatGPT clone backend',
      text: '## Overview\n\nThis backend powers a chat application that behaves like a ChatGPT clone.\nIt uses a mocked language model to produce long responses that help you test the UI.\n\n## Architecture\n\nThe system is built with NestJS and organized into modules for authentication, chats, and streaming.\nEach incoming request passes through common guards and middleware before it reaches a controller.\nYour data is stored in Postgres tables for users, chats, and messages.\n\n## Streaming\n\nWhen the user sends a message, the backend saves it and creates an empty assistant message.\nA simulated response is then streamed back word by word over a server sent events connection.\nThe full answer is persisted once streaming completes successfully.\n\n## Key points\n\n- Responses are intentionally long to exercise scrolling.\n- Section headings start with two hashes and a space.\n- Bullet items start with a dash and a space.\n- Blank lines separate paragraphs and lists.\n',
    },
    {
      topic: 'Designing prompts for this system',
      text: '## Designing prompts\n\nPrompts in this system behave similarly to prompts sent to a real language model.\nThe backend does not change your text, so the structure you send matters.\n\n## Core principles\n\n- Be clear about the outcome you want from the assistant.\n- Give the model any context that the request alone does not reveal.\n- Prefer concrete constraints over vague instructions.\n\n## Example prompt\n\nYou are helping me test a chat application that streams responses.\nExplain what the backend is doing.\nUse several sections with headings and some short bullet lists.\n\n## Why it matters\n\nWell designed prompts make it easier to reason about how the UI should behave.\nThey also become good fixtures when you later plug in a real model provider.\n',
    },
    {
      topic: 'Paginating chat history',
      text: '## Paginating chat history\n\nYour backend returns messages in pages so the UI can handle long conversations.\nEach page contains a slice of the most recent messages for a given chat.\n\n## Ordering strategy\n\n- The database query selects the most recent messages first.\n- The results in each page are sorted from oldest to newest.\n\n## What this means\n\nPage one contains the newest messages, shown in the correct reading order.\nPage two contains the next block of older messages, also ordered from oldest to newest.\nThe UI can prepend older pages above the existing viewport without breaking continuity.\n\n## Practical tips\n\n- Preserve scroll position when inserting older messages at the top.\n- Keep the view anchored near the bottom while new assistant chunks arrive.\n- Avoid fetching more pages than you actually need.\n',
    },
    {
      topic: 'Markdown formatting showcase',
      text: '## Formatting showcase\n\nThis sample focuses on the subset of formatting that your UI understands.\nThe goal is to verify section headings, paragraphs, and bullet lists.\n\n## Headings\n\n- Use lines that start with two hashes and a space.\n- Each such line becomes the title of a section.\n- Content that follows stays inside the same section until the next heading.\n\n## Lists\n\n- Use lines that start with a dash and a space for bullet items.\n- Each bullet becomes a separate list item in the rendered output.\n- Blank lines can separate lists from surrounding paragraphs.\n\n## Paragraphs\n\nNormal sentences that do not start with hashes or dashes become paragraph text.\nMultiple lines are merged into a single paragraph until an empty line appears.\n',
    },
    {
      topic: 'Error handling and edge cases',
      text: '## Error handling\n\nA robust chat experience needs graceful handling of failures.\nNetwork issues and validation problems should not completely break the conversation.\n\n## Common failure modes\n\n- Network interruptions while streaming a long answer.\n- Expired or invalid authentication tokens on the client.\n- Backend validation errors for malformed input.\n\n## Recommended patterns\n\n- Show a small inline error if the stream stops unexpectedly.\n- Allow the user to retry sending the same prompt.\n- Keep any chunks that already arrived visible in the chat.\n',
    },
    {
      topic: 'Simulated system message',
      text: '## System style explanation\n\nThis message behaves like a system notice that explains how the chat engine works.\nIt is long on purpose so you can see how multiple sections render together.\n\n## What it covers\n\n- The relationship between chats and messages.\n- How streaming events are turned into assistant content.\n- How chat titles can be derived from early chunks.\n\n## Takeaways\n\nIf you can read this reply clearly in the UI, the basic layout is working.\nThe same structure will also handle real world messages from an external model provider.\n',
    },
    {
      topic: 'Frontend streaming checklist',
      text: '## Frontend streaming checklist\n\nUse this checklist to validate that your chat UI handles streaming responses correctly.\n\n- Display the user message immediately.\n- Show a typing indicator while assistant chunks arrive.\n- Append incoming assistant chunks to a single message bubble.\n- Preserve scroll position when older messages are loaded.\n- Handle connection errors without losing the conversation.\n\nIf the full checklist appears in the chat, your pipeline from mocked backend to UI is working as expected.\n',
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

    const sample = this.pickSample();
    if (onSampleChosen) {
      onSampleChosen(sample);
    }

    const fullResponse = sample.text;

    const tokens = fullResponse.split(' ');
    const chunks: string[] = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (!token) {
        continue;
      }
      if (i < tokens.length - 1) {
        chunks.push(`${token} `);
      } else {
        chunks.push(token);
      }
    }

    const totalChunks = chunks.length;

    if (totalChunks === 0) {
      subject.complete();
      return subject.asObservable();
    }

    const maxTotalMs = 15000;
    const delayMs = Math.max(1, Math.floor(maxTotalMs / totalChunks));

    let currentIndex = 0;

    const emitNext = () => {
      if (currentIndex >= totalChunks) {
        subject.complete();
        return;
      }

      subject.next(chunks[currentIndex]);
      currentIndex += 1;

      if (currentIndex < totalChunks) {
        setTimeout(emitNext, delayMs);
      }
    };

    setTimeout(emitNext, delayMs);

    return subject.asObservable();
  }

  async generateResponse(prompt: string): Promise<string> {
    const sample = this.pickSample();
    const base =
      sample.text ||
      'This is a default simulated response generated without any artificial delay.';
    return base;
  }
}
