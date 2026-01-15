# ChatGPT Clone API Guide (Backend Overview)

This backend powers a ChatGPT-style chat system used in the Turing Technologies hiring test. It is built on NestJS, Supabase Auth, and Postgres (via TypeORM). This document focuses on the endpoints a frontend needs to build a simple chat UI with streaming AI responses.

---

## Auth

All chat endpoints require a Supabase-authenticated user. Use these endpoints to sign up/sign in and obtain an access token.

### Sign up

- **URL:** `POST /api/auth/signup`
- **Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "yourPassword",
  "fullName": "Jane Doe"
}
```

- **Response (shape):**

```json
{
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "...": "...",
      "user_metadata": {
        "fullName": "Jane Doe"
      }
    },
    "dbUser": {
      "id": "...",
      "supabaseId": "...",
      "email": "user@example.com",
      "fullName": "Jane Doe"
    },
    "message": "Sign up successful. Please check your email to verify your account."
  },
  "statusCode": 201,
  "timestamp": "2026-01-15T..."
}
```

### Sign in

- **URL:** `POST /api/auth/signin`
- **Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "yourPassword"
}
```

- **Response (shape):**

```json
{
  "data": {
    "accessToken": "<supabase_jwt>",
    "refreshToken": "...",
    "user": { "id": "...", "email": "user@example.com", "...": "..." }
  },
  "statusCode": 200,
  "timestamp": "2026-01-15T..."
}
```

Use `data.accessToken` as a Bearer token:

```http
Authorization: Bearer <accessToken>
```

### Update profile (full name)

- **URL:** `PATCH /api/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Body (JSON):**

```json
{
  "fullName": "Jane Doe"
}
```

- **Response (shape):**

```json
{
  "data": {
    "id": "supabase-user-id",
    "email": "user@example.com",
    "emailVerified": true,
    "emailVerifiedAt": "2026-01-15T...",
    "fullName": "Jane Doe",
    "metadata": {
      "fullName": "Jane Doe",
      "...": "..."
    },
    "dbUser": {
      "id": "internal-db-id",
      "supabaseId": "supabase-user-id",
      "email": "user@example.com",
      "emailVerified": true,
      "fullName": "Jane Doe",
      "createdAt": "2026-01-15T..."
    }
  },
  "statusCode": 200,
  "timestamp": "2026-01-15T..."
}
```

---

## Chats

All chat endpoints live under `/api/chats` and are protected by the global `AuthGuard`. Ownership is enforced at the database level (only the chat owner can access a chat).

### Create a chat

- **URL:** `POST /api/chats`
- **Headers:** `Authorization: Bearer <token>`
- **Body (JSON):**

```json
{ "title": "My first chat" }
```

- **Response (shape & behaviour):**

```json
{
  "data": {
    "chat": {
      "id": "chat-uuid",
      "userId": "internal-user-id",
      "title": "My first chat",
      "createdAt": "2026-01-15T..."
    },
    "created": true
  },
  "statusCode": 201,
  "timestamp": "2026-01-15T..."
}
```

- **Empty chat reuse semantics:**
  - When you call `POST /api/chats`, the backend will:
    - First look for an **existing empty chat** for the current user (a chat with no messages).
    - If an empty chat exists, it will return that chat and set `"created": false`.
    - If no empty chat exists, it will create a new one and set `"created": true`.
  - This allows the frontend to:
    - Reuse the same empty chat session instead of creating duplicates.
    - Detect whether the chat was newly created or an existing empty one was reused.

### List user chats

- **URL:** `GET /api/chats`
- **Headers:** `Authorization: Bearer <token>`
- **Response (shape):**

```json
{
  "data": [
    {
      "id": "chat-uuid",
      "userId": "internal-user-id",
      "title": "My first chat",
      "createdAt": "2026-01-15T..."
    }
  ],
  "statusCode": 200,
  "timestamp": "2026-01-15T..."
}
```

### Get a single chat

- **URL:** `GET /api/chats/:id`
- **Headers:** `Authorization: Bearer <token>`

Returns the chat only if it belongs to the current user.

---

## Messages

Messages belong to a chat and have a `role` of either `USER` (human prompt) or `ASSISTANT` (AI response). The backend enforces that the AI only responds to user prompts.

### Stream an AI response (SSE)

This endpoint both **records the user prompt** and **streams back the AI response**.

- **URL:** `GET /api/chats/:id/messages/stream?content=<urlencoded_prompt>`
- **Headers:**

```http
Authorization: Bearer <token>
Accept: text/event-stream
```

- **Server behavior:**
  - Verifies the chat belongs to the current user.
  - Creates a `Message` with `role = "USER"` and the provided `content`.
  - Verifies the latest message in the chat is a user prompt.
  - Streams AI response chunks over SSE.
  - When the stream completes, concatenates all chunks and stores a `Message` with `role = "ASSISTANT"` and the full response content, linked to the chat.

- **SSE event format:**

The backend sends **JSON** payloads that match the `StreamChunk` schema in `chat-api-spec.json`, wrapped as a `data` property for SSE:

```json
{
  "data": {
    "messageId": "assistant-message-id",
    "previousMessageId": "previous-message-id-or-null",
    "chatId": "chat-uuid",
    "role": "assistant",
    "content": "Partial chunk text...",
    "index": 1,
    "createdAt": "2026-01-15T..."
  }
}
```

- **Event sequence:**
  - First event:
    - Represents the user prompt.
    - `role = "user"`, `index = 0`, `content` is the full user message.
  - Subsequent events:
    - Represent assistant chunks.
    - `role = "assistant"`, `index` increments for each chunk, `content` is the partial text chunk.

On the frontend, treat `event.data` as JSON:

1. Parse it: `const payload = JSON.parse(event.data);`
2. Read `payload.data` as the current chunk.
3. Use `messageId`, `previousMessageId`, and `index` to build or update the in-progress assistant message in the UI.

### List messages in a chat (pagination + filters)

- **URL:** `GET /api/chats/:id/messages`
- **Headers:** `Authorization: Bearer <token>`
- **Query params:**
  - `page` – page number (1-based, default `1`)
  - `limit` – items per page (default `20`)
  - `role` – `USER` or `ASSISTANT`
  - `before` – ISO datetime string; filters `createdAt < before`
  - `after` – ISO datetime string; filters `createdAt > after`
  - `search` – case-insensitive substring search on `content`

- **Example:**

```http
GET /api/chats/<chatId>/messages?page=1&limit=50&role=ASSISTANT&search=error
Authorization: Bearer <token>
```

- **Response (shape):**

```json
{
  "data": {
    "items": [
      {
        "id": "message-uuid",
        "chatId": "chat-uuid",
        "role": "ASSISTANT",
        "content": "Full assistant response...",
        "createdAt": "2026-01-15T..."
      }
    ],
    "total": 123,
    "page": 1,
    "limit": 50
  },
  "statusCode": 200,
  "timestamp": "2026-01-15T..."
}
```

---

## Typical Frontend Flow

1. **Sign in**
   - Call `POST /api/auth/signin`, store `data.accessToken` as a Bearer token.

2. **Create or select a chat**
   - Use `POST /api/chats` to create a new chat, or `GET /api/chats` to list existing ones.

3. **Send a prompt and stream AI reply**
   - Call `GET /api/chats/:id/messages/stream?content=...` with SSE (EventSource in browser or streaming fetch).
   - Render incoming chunks as they arrive.

4. **Reload message history**
   - Use `GET /api/chats/:id/messages` with appropriate `page`, `limit`, and optional filters (`role`, `before`, `after`, `search`) to reconstruct the conversation from the database.

