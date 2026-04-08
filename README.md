# boson

Open-source, local-first desktop database workspace built with **Tauri 2 + React + Vite + TypeScript**.

## Development

Install dependencies:

```bash
pnpm install
```

Run as a desktop app (recommended):

```bash
pnpm tauri dev
```

Run as a web app:

```bash
pnpm dev
```

Build:

```bash
pnpm build
pnpm tauri build
```

## UI

- **Tailwind CSS v4** + **shadcn/ui**
- **Icons**: `@tabler/icons-react`
- **Theme**: system by default; the titlebar toggle switches **light ↔ dark**

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
