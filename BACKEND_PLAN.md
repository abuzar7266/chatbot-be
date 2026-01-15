# Backend Development Plan - ChatGPT Clone

This document outlines the roadmap for implementing the backend of the ChatGPT Clone using NestJS and Supabase.

## Phase 1: Database Schema Design
**Goal:** specific database entities to store chat sessions and messages.

- [ ] **Create `Chat` Entity**
    - `id`: UUID (Primary Key)
    - `userId`: UUID (Foreign Key to Users)
    - `title`: String (e.g., "New Chat", or first message snippet)
    - `createdAt`: Timestamp
- [ ] **Create `Message` Entity**
    - `id`: UUID
    - `chatId`: UUID (Foreign Key to Chat)
    - `role`: Enum ('user' | 'assistant')
    - `content`: Text
    - `createdAt`: Timestamp
- [ ] **Update `User` Entity**
    - Add one-to-many relationship to `Chat`.

## Phase 2: Simulated LLM Service
**Goal:** Create a service that mimics an external AI provider with a delay.

- [ ] **Create `LlmModule` & `LlmService`**
- [ ] **Implement `generateResponse(prompt: string)`**
    - **Delay:** Introduce a non-blocking `setTimeout` / `Promise` delay of **10–20 seconds**.
    - **Response:** Return a hardcoded, multi-sentence string (lorem ipsum or specific placeholder text).
    - **Async:** Ensure this does not block the main Node.js event loop.

## Phase 3: Chat & Message APIs
**Goal:** RESTful endpoints for the frontend to interact with.

- [ ] **Create `ChatModule`, `ChatController`, `ChatService`**
- [ ] **Endpoints:**
    - `GET /chats`: Retrieve all chat sessions for the current user.
    - `POST /chats`: Create a new chat session.
    - `GET /chats/:id`: Get details of a specific chat.
    - `GET /chats/:id/messages`: Get message history for a chat.
    - `POST /chats/:id/messages`: Send a user message.
        - **Flow:**
            1. Save User message to DB.
            2. Trigger `LlmService.generateResponse()`.
            3. Save Assistant message to DB.
            4. Return the new message(s).

## Phase 4: Security & Ownership
**Goal:** Ensure data privacy and route protection.

- [ ] **Global/Route Guards**
    - Ensure all Chat APIs are protected by `AuthGuard`.
- [ ] **Ownership Logic**
    - In `ChatService`, always filter queries by `userId`.
    - Prevent User A from accessing User B's chats (return 403 or 404).

## Deliverables Checklist
- [ ] Database Schema created & synced.
- [ ] LLM Simulation working with non-blocking delay.
- [ ] API Endpoints tested with Postman/Swagger.
- [ ] Auth & Ownership verified.
