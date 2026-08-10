# Final Delivery Notes

This package contains the deeply audited IOCL Lorry Entry/Exit Gate Management MVP source, forward Prisma migrations, corrected zero-install browser demo, deployment/backup assets and operational documentation.

## Read first

- `docs/DEEP_AUDIT_REPORT.md` — specification matrix, defects fixed and exact evidence.
- `docs/QA_REPORT.md` — verification run and release gates not executable in this container.
- `docs/PRODUCTION_ACCEPTANCE.md` — mandatory go-live sign-off.

## Working browser demo

Open `client-demo/index.html` in Chrome or Edge.

Demo password: `Gate@123`

- `SEC1001` — Entry Gate Security
- `EXT1001` — Exit Gate Security
- `ADM1001` — Administrator

Use **Load Client QR** for the real expired-data warning/block, or **Load Future-Valid QR** for a successful IN → OUT → Admin demonstration. The demo was executed at desktop and Android-size viewports with zero console/page errors. It stores preview data only in browser storage.

## Connected application

1. Copy `.env.example` to `.env` and replace database/JWT values.
2. Run `npm ci`.
3. Run `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
4. Run `npm run verify`.
5. Run `npm run dev` and open `http://localhost:3000`.

## Production status

This is a production-structured **release candidate**, not an automatic live-terminal approval. Clean install/build/migration/Docker gates, staging PostgreSQL tests, real tablet/scanner UAT, backup restore, load/security testing, official QR authenticity and client decisions must pass before opening a gate.
