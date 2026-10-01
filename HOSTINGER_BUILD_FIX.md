# Hostinger build fix

The production build is configured to use Webpack instead of Turbopack because the original
Next.js 16 build was failing while processing `src/app/globals.css`.

Build:
`npm run build`

This runs:
`prisma generate && next build --webpack`

Start:
`npm start`

Hostinger can keep its Build Command as `npm run build`.
