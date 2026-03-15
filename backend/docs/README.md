# Legal Knowledge Base (RAG Corpus)

This folder contains legal reference documents used by the AI triage chatbot.

## File types

- `legal_manifest.json`: metadata registry for each legal document file.
- `*.md` / `*.txt`: source content that will be chunked and embedded.

## Important

- Keep only factual, verified legal material from trusted sources.
- Add citations and source URLs in `legal_manifest.json`.
- Avoid storing confidential client data in this folder.
- Review and update documents when laws change.

## Quick workflow

1. Add or update documents in this folder.
2. Register each file in `legal_manifest.json` with metadata.
3. Run `npm run index:docs` from `backend`.
4. Test client AI chat in the dashboard.
