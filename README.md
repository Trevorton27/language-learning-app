# AI Flashcard App

A modern web application for learning Japanese and English vocabulary using AI-powered flashcards. Built with Next.js 14, featuring intelligent vocabulary processing, dark mode support, and a clean, responsive design.

## Features

### Core Functionality
- Interactive flashcard study mode with quiz options
- Mobile-friendly carousel view with swipe gestures
- Grid view for desktop browsing
- Japanese-first display (Kanji on front, English on back)
- Hiragana reading display for all cards

### AI-Powered Vocabulary Upload
- **Multiple Input Formats**: Upload TXT, CSV, JSON, PDF, Word docs, or images
- **Text Input**: Paste vocabulary directly in any format
- **Automatic Language Detection**: Identifies English vs Japanese content
- **AI Translation**: Translates between languages using GPT-4
- **Hiragana Generation**: Automatically generates readings for kanji
- **Smart Categorization**: Auto-categorizes vocabulary (noun, verb, etc.)
- **Duplicate Detection**: Identifies existing vocabulary to prevent duplicates
- **Ambiguity Resolution**: Prompts for clarification on terms with multiple translations
- **Preview & Edit**: Review all processed vocabulary before saving

### User Experience
- Dark/Light/System theme toggle
- Responsive design for all screen sizes
- Smooth animations and transitions
- Real-time processing feedback with progress indicators

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **AI**: OpenAI GPT-4o / GPT-4o-mini
- **Authentication**: Clerk (optional)
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon account)
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-flashcard-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by creating `.env.local`:
   ```env
   # Database
   POSTGRES_URL=your_postgres_connection_string

   # OpenAI (for AI features)
   OPENAI_API_KEY=your_openai_api_key

   # Optional: Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   CLERK_SECRET_KEY=your_clerk_secret
   ```

4. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ai-flashcard-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── flashcards/          # CRUD for flashcards
│   │   │   ├── upload/              # Legacy upload endpoint
│   │   │   │   ├── process/         # AI processing endpoint
│   │   │   │   └── confirm/         # Save processed vocabulary
│   │   │   └── import-vocab/        # Bulk import endpoint
│   │   ├── flashcards/              # Study page
│   │   ├── upload/                  # Upload page
│   │   ├── layout.tsx               # Root layout with theme
│   │   └── page.tsx                 # Home page
│   ├── components/
│   │   ├── upload/                  # Upload feature components
│   │   │   ├── EnhancedUploadForm.tsx
│   │   │   ├── ProcessingModal.tsx
│   │   │   ├── PreviewTable.tsx
│   │   │   └── ClarificationPrompt.tsx
│   │   ├── FlashcardCard.tsx
│   │   ├── Navigation.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ThemeToggle.tsx
│   └── lib/
│       ├── ai/                      # AI processing modules
│       │   ├── openai.ts            # OpenAI client setup
│       │   ├── extractor.ts         # Content extraction
│       │   ├── translator.ts        # Translation service
│       │   ├── formatter.ts         # Flashcard formatting
│       │   └── processor.ts         # Main orchestration
│       └── db.ts                    # Prisma client
├── prisma/
│   └── schema.prisma                # Database schema
├── public/
├── tailwind.config.js
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flashcards` | Get all flashcards |
| POST | `/api/flashcards` | Create a flashcard |
| DELETE | `/api/flashcards` | Delete all flashcards |
| POST | `/api/upload/process` | Process uploaded content with AI |
| POST | `/api/upload/confirm` | Save processed vocabulary |
| POST | `/api/import-vocab` | Bulk import vocabulary |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | For AI features | OpenAI API key for translations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | Clerk public key |
| `CLERK_SECRET_KEY` | No | Clerk secret key |

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

The app is configured for automatic deployments on push to main.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.
