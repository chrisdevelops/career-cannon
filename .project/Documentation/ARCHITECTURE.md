# 🏗 Architecture Document

## 1. High-Level Architecture

```
┌────────────┐
│   React UI │
└─────┬──────┘
      │
┌─────▼──────┐
│  API Layer │  (Node + Express)
└─────┬──────┘
      │
┌─────▼──────┐
│ Knowledge  │  (SQLite / Prisma)
│ Base Store │
└─────┬──────┘
      │
┌─────▼──────┐
│ AI Layer   │  (Parsing, Matching, Generation)
└────────────┘
```

---

## 2. Frontend Architecture

### Stack

* React
* TypeScript
* ShadCN UI
* Tailwind CSS
* Zod
* Zustand (light global state only)

### Key UI Areas

* Knowledge Base Editor
* Resume Import Review
* Resume / Cover Letter Generator
* History Viewer
* Voice Blueprint Editor

### State Strategy

* Local component state by default
* Zustand only for:

  * Knowledge base snapshot
  * Active generation session

---

## 3. Backend Architecture

### Stack

* Node.js
* Express
* TypeScript
* SQLite
* Prisma
* Zod (shared schemas)

### Responsibilities

* Persist KB
* Validate mutations
* Maintain history log
* AI orchestration (not UI logic)

---

## 4. Data Persistence

### Core Tables (Conceptual)

* profile
* roles
* experience_items
* achievements
* skills
* projects
* education
* voice_blueprint
* change_log
* generations
* generation_versions

### Change Log Model

* entity_type
* entity_id
* action
* before_snapshot
* after_snapshot
* timestamp

---

## 5. AI Integration Strategy

### AI Use Cases

1. Resume parsing
2. Duplicate detection
3. Resume generation
4. Cover letter generation
5. Chat-based refinement

### Guardrails

* AI output is **never auto-committed**
* All mutations pass schema validation
* KB mutations are atomic

---

## 6. Resume Import Flow (Technical)

1. Upload resume
2. Extract raw text
3. AI parses into candidate entities
4. System runs duplicate detection
5. User reviews staged changes
6. User confirms → commit transaction

---

## 7. Resume / Cover Letter Generation Flow

1. User submits JD + options
2. System builds structured prompt:

   * KB slice
   * Voice blueprint
   * Temperature
3. AI generates draft
4. User chats → new versions
5. Versions stored immutably

---

## 8. Design System Rules

* ShadCN components first
* Tailwind defaults preferred
* No visual over-customization
* Minimalist, whitespace-heavy UI

---

## 9. Open Questions (Worth Clarifying Next)

I don’t *need* answers immediately, but these are the next forks:

1. **Offline-first vs server-only?**
2. **Local LLM support later?**
3. **Embedding storage now or later?**
4. **Diff-based history vs full snapshot?**
