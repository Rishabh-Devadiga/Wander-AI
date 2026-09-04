# AGENTS.md

## Project Development Rules

You are working on the Wander-AI project.

Before making any changes:

1. Read this `AGENTS.md`.
2. Read `README.md`.
3. Read the `AI Development Context / Change Log` section in `README.md`.
4. Inspect the actual source code before relying on previous documentation.
5. Do not assume previous AI work is correct or complete.
6. Do not undo correctly implemented functionality from previous work.
7. Keep the frontend and backend API contracts compatible.

## Persistent Context Documentation

After making changes, update the `AI Development Context / Change Log`
section of `README.md`.

Document only factual information about the work actually performed:

- What was inspected
- What was changed
- Files modified
- APIs/routes added, modified, or removed
- Architecture changes
- Bugs fixed
- Tests/checks performed and their results
- Known remaining issues
- Environment/deployment changes
- Important implementation details another AI needs to understand

Do NOT add:

- Recommendations
- Future-work suggestions
- "Next steps"
- Instructions telling another AI what to implement
- Speculation about functionality that has not been verified

Only document changes that actually exist in the repository.

## Verification

Before reporting completion:

1. Verify modified files.
2. Run appropriate tests.
3. Run build/type checks when applicable.
4. Report failures honestly.
5. Make sure README accurately describes the current implementation.

Never claim a feature works unless it has been verified.

## Architecture Rule

FastAPI is the intended production backend.

Do not introduce new production API functionality into the old
Node/Express backend unless explicitly required.

Frontend API calls must correspond to implemented backend routes.

## Security

Never expose API keys or secrets in frontend/browser code.

Use environment variables for secrets.

Do not commit `.env` files containing credentials.

## Scope

Make the requested changes directly in the repository.

Do not merely explain how to make the changes when the changes can
be implemented directly.

Do not make unrelated architectural changes without a clear reason.