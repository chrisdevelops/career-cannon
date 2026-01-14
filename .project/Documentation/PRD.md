# 📄 Product Requirements Document (PRD)

## Product Name (Working)

**Resume Knowledge Base & Generator**
*(Name intentionally generic for MVP; branding is out of scope.)*

---

## 1. Purpose & Vision

The purpose of this application is to provide a **source-of-truth knowledge base** for a user’s professional history that enables high-quality, authentic, AI-generated resumes and cover letters.

Instead of repeatedly rewriting resumes and cover letters from scratch, the user maintains an **exhaustive, structured professional record**. AI agents then selectively compile and synthesize this information based on job descriptions and user intent.

The product optimizes for:

* Low-friction data entry
* Non-linear knowledge building
* High trust and reversibility
* Authentic voice preservation
* Deterministic, explainable AI output

---

## 2. Target User

* **Primary (MVP):** The product creator (single user)
* **Future:** Knowledge workers, engineers, designers, PMs, consultants

---

## 3. Core Principles

1. **Source of Truth First**
   Generated resumes and cover letters are *derived artifacts*, never edited directly.

2. **Atomic Data > Narrative Storage**
   Experience is stored as small, typed units that can be recombined.

3. **Human Effort Once, AI Reuse Forever**
   Users invest effort upfront to gain long-term leverage.

4. **Undoability and Trust**
   Every change must be reversible.

5. **Minimal UI, Maximum Leverage**
   No unnecessary views, flows, or nesting.

---

## 4. Functional Requirements

### 4.1 Knowledge Base Management

#### Supported Data Types

* Profile & contact info
* Roles (company, title, dates)
* Experience items (responsibilities, initiatives, etc.)
* Achievements (problem → action → outcome)
* Skills (with evidence)
* Projects & learnings
* Education
* Voice blueprint (optional)

#### Requirements

* User can add, edit, or delete any item at any time
* Entry is **non-linear** (no forced wizard)
* Items can be linked implicitly (e.g., skill ↔ experience)
* Editing does not require navigating away from context

---

### 4.2 Resume Import (AI-Assisted Ingestion)

#### Input

* PDF / DOCX / plaintext resume

#### Behavior

1. AI parses resume into structured candidates:

   * Roles
   * Experience items
   * Achievements
   * Skills
   * Education
2. Parsed entries are **not auto-committed**
3. User is presented with a **review screen**:

   * New entries
   * Potential duplicates
   * Conflicts (same role, different dates, etc.)
4. User can:

   * Accept
   * Modify
   * Reject
   * Merge with existing entries

---

### 4.3 Duplicate Detection

#### Scope

* Manual entry
* Resume import

#### Detection Strategy (MVP)

* Text similarity (cosine / embedding)
* Exact matches on:

  * Role (company + title + date overlap)
  * Skill name
* Heuristic thresholds (configurable)

#### UX

* Duplicates are surfaced clearly
* User chooses:

  * “Add anyway”
  * “Merge”
  * “Cancel”

---

### 4.4 Change History & Undo

#### Requirements

* Every mutation is logged:

  * Add
  * Update
  * Delete
* History entries include:

  * Timestamp
  * Entity type
  * Before / after snapshot
* User can:

  * Undo a single change
  * Restore a prior state

#### Constraints

* No branching history (linear timeline for MVP)

---

### 4.5 Voice Blueprint (Optional but Important)

#### Purpose

Capture the user’s authentic writing style so AI output sounds human.

#### Data Collected

* Tone preferences
* Vocabulary tendencies
* Sentence length
* Formality level
* Things to avoid
* Example writing samples (optional)

#### Output

* A structured instruction block usable directly in AI prompts

---

### 4.6 Resume Generation

#### Input Methods

* Job description (primary)
* Optional user guidance prompt

#### Temperature Slider (0 → 1)

* `0.0` → General, role-focused, experience-led
* `1.0` → Hyper-mapped to JD requirements
* Default: `0.8`

#### Behavior

* AI selects relevant experience & achievements
* Generates ATS-friendly resume
* User can chat with AI to refine
* Each iteration is saved as a new version

---

### 4.7 Cover Letter Generation

#### Inputs

* Job description
* User prompt (priority input)
* Knowledge base
* Voice blueprint (if configured)

#### Behavior

* AI prioritizes user intent
* Pulls evidence from knowledge base
* Maintains authentic tone
* Supports iterative refinement
* Versions are saved

---

### 4.8 Generation History

#### Organization

* Grouped by job description:

  * Company
  * Position
  * Date
* Within each group:

  * Resume versions
  * Cover letter versions

#### Capabilities

* View versions
* Compare versions
* Reopen chat context

---

### 4.9 Export

#### Resume Export

* ATS-friendly text
* Markdown

#### Cover Letter Export

* Plain text
* Markdown

---

### 4.10 Knowledge Base Import / Export

#### Export

* JSON (schema-validated)

#### Import

* Overwrites existing KB
* Warning shown
* Backup recommended

---

## 5. Non-Functional Requirements

* Single-user only
* Local or lightweight storage
* Fast load times
* Deterministic behavior
* AI failures must not corrupt KB