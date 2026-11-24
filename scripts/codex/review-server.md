You are reviewing a small Node.js game server for security and correctness. Read server/server.mjs and public/js/battle-core.js in this repository (and package.json). Do NOT modify any files.

Context: students create accounts (username, password, course), progress is saved as JSON in SQLite (node:sqlite), and student-written JavaScript "AI" code for an arena game is executed on the server inside a QuickJS WebAssembly sandbox (quickjs-emscripten) with a deadline interrupt and memory limit.

Check specifically:
1. Can student code escape the QuickJS sandbox or crash/hang the Node process (event-loop blocking, memory, huge outputs)?
2. Auth: password hashing, session cookies, timing attacks, CSRF protection, rate limiting, username enumeration.
3. SQL injection, path traversal in the static file server, JSON body limits.
4. Logic bugs in the Elo/ranking or duel endpoints (e.g. a user leaking another user's bot code).
5. Anything that would break on Windows.

Output a concise list of findings ordered by severity, each with: file:line, the problem, a concrete exploit or failure scenario, and a suggested fix. If something is fine, say so briefly. Keep it under 400 words.
