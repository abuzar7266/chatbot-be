// Simple Node script to test Chat + SSE streaming
// It now logs in via the backend /auth/signin endpoint to get a Supabase access token.
//
// Usage:
//   1) Install deps: npm install eventsource node-fetch
//   2) Set env:
//        set CHATBOT_API_URL=http://localhost:3000   (optional)
//        set TEST_USER_EMAIL=you@example.com
//        set TEST_USER_PASSWORD=your_password
//      (Alternatively you can still set SUPABASE_ACCESS_TOKEN to skip login)
//   3) Run:
//        node scripts/test-chat-sse.js

/* eslint-disable @typescript-eslint/no-var-requires */
const fetch = require('node-fetch');

const BASE_URL = process.env.CHATBOT_API_URL || 'http://localhost:3000';
const DIRECT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function getAccessToken() {
  if (DIRECT_TOKEN) {
    console.log('Using SUPABASE_ACCESS_TOKEN from environment');
    return DIRECT_TOKEN;
  }

  const email = "abuzar.m7266@gmail.com"
  const password = "Batch2019#tag"

  if (!email || !password) {
    console.error(
      'You must set TEST_USER_EMAIL and TEST_USER_PASSWORD (or SUPABASE_ACCESS_TOKEN).',
    );
    process.exit(1);
  }

  console.log('🔐 Logging in via /api/auth/signin to obtain access token...');

  const res = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    console.error('❌ Failed to sign in:', res.status, await res.text());
    process.exit(1);
  }

  const body = await res.json();

  // API responses are wrapped by TransformInterceptor as:
  // { data: { accessToken, refreshToken, user }, statusCode, timestamp }
  const token = body?.data?.accessToken || body?.accessToken;

  if (!token) {
    console.error('❌ /auth/signin response did not include accessToken:', body);
    process.exit(1);
  }

  console.log('✅ Received access token from /auth/signin');
  return token;
}

async function main() {
  console.log('🚀 Starting Chat SSE test against', BASE_URL);

  const token = await getAccessToken();

  // 1) Create a chat
  console.log('\n1️⃣ Creating chat...');
  const createRes = await fetch(`${BASE_URL}/api/chats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: 'SSE Test Chat' }),
  });

  if (!createRes.ok) {
    console.error('❌ Failed to create chat:', createRes.status, await createRes.text());
    process.exit(1);
  }

  const createBody = await createRes.json();
  const chat = createBody?.data || createBody;
  console.log('✅ Chat created with id:', chat.id);

  // 2) Open SSE stream for a message
  console.log('\n2️⃣ Opening SSE stream for AI response...');

  const prompt = 'Explain what this backend is doing in two sentences.';
  const url = `${BASE_URL}/api/chats/${chat.id}/messages/stream?content=${encodeURIComponent(
    prompt,
  )}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
  });

  if (!res.ok || !res.body) {
    console.error('❌ Failed to open SSE stream:', res.status, await res.text());
    process.exit(1);
  }

  console.log('🔌 SSE HTTP connection opened');

  res.body.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    // SSE sends blocks separated by double newlines; each block may contain "data: ..."
    const blocks = text.split(/\n\n/);
    for (const block of blocks) {
      if (!block.trim()) continue;
      const match = block.match(/^data:\s?(.*)$/m);
      if (match) {
        console.log('📩 chunk:', match[1]);
      } else {
        // Raw block (useful for debugging)
        console.log('📦 raw event block:', block.trim());
      }
    }
  });

  res.body.on('end', () => {
    console.log('✅ SSE stream ended');
  });

  res.body.on('error', (err) => {
    console.error('⚠️ SSE stream error:', err);
  });
}

main().catch((err) => {
  console.error('Unexpected error in test script:', err);
  process.exit(1);
});
