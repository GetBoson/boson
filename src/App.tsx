import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Titlebar } from "@/components/titlebar";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Titlebar />
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-12 pt-16 text-center">
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome to Tauri + React
        </h1>

        <div className="flex items-center justify-center gap-6">
          <a href="https://vite.dev" target="_blank" rel="noreferrer">
            <img
              src="/vite.svg"
              className="h-16 w-16 transition hover:opacity-90"
              alt="Vite logo"
            />
          </a>
          <a href="https://tauri.app" target="_blank" rel="noreferrer">
            <img
              src="/tauri.svg"
              className="h-16 w-16 transition hover:opacity-90"
              alt="Tauri logo"
            />
          </a>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            <img
              src={reactLogo}
              className="h-16 w-16 transition hover:opacity-90"
              alt="React logo"
            />
          </a>
        </div>

        <p className="text-sm text-muted-foreground">
          shadcn/ui + Tailwind v4 are now installed.
        </p>

        <form
          className="flex w-full max-w-sm items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
          />
          <Button type="submit">Greet</Button>
        </form>

        {greetMsg ? (
          <p className="text-sm text-foreground">{greetMsg}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a name and click Greet.
          </p>
        )}
      </div>
    </main>
  );
}

export default App;
