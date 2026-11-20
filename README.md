# CACA — AI Lecture Summarizer (Starter)
A free-tier friendly prototype for public PPTX upload → AI study module → PDF.

## Included
- Public no-login frontend
- Multi-PPTX upload and slide-text extraction
- Cloudflare Pages Function API route (API key stays server-side)
- Gemini-generated structured module: summaries, tables, exactly 15 HOTS vignettes, Quick Memory Kit
- PDF generation/download with pagination and table support

## Important caveats
- This prototype extracts slide text only. It does not yet OCR text embedded in pictures or interpret charts/images.
- Large decks may exceed API context/Cloudflare request limits. For robust use, add chunking/merge and size limits.
- Keep API key private. Set `GEMINI_API_KEY` as a Cloudflare Pages secret, never in frontend code.
- Free API usage limits and model availability can change. Do not upload patient data or confidential documents.

## Local development
1. Install Node.js LTS.
2. In this directory run `npm install`.
3. `npm run dev` to preview frontend (API endpoint won't work until Pages Functions are run locally with Wrangler and env secrets configured).

## Deploy (Cloudflare Pages)
1. Push this folder to a GitHub repository.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Deploy.
6. In Pages project → Settings → Variables and Secrets, add `GEMINI_API_KEY` (secret). Optionally `GEMINI_MODEL`.
7. Redeploy after adding secret.

For local Pages Functions, install Wrangler and run `npx wrangler pages dev dist` after building. Provide secrets in local `.dev.vars` (do not commit):
`GEMINI_API_KEY=your_key_here`
`GEMINI_MODEL=gemini-2.5-flash`
