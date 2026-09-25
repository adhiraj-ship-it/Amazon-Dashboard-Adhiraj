"use client";

import { useEffect, useState } from "react";

type Choice = "light" | "dark" | "system";

function resolve(choice: Choice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(choice: Choice) {
  document.documentElement.setAttribute("data-theme", resolve(choice));
  try {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  } catch {
    // Private windows can refuse storage; the theme still applies for this session.
  }
}

const OPTIONS: { value: Choice; label: string; title: string }[] = [
  { value: "light", label: "☀", title: "Light" },
  { value: "dark", label: "☾", title: "Dark" },
  { value: "system", label: "◐", title: "Match system" },
];

export function ThemeToggle() {
  // Starts null so the server-rendered markup and the first client render
  // agree; the stored choice is read after mount.
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    let stored: Choice = "system";
    try {
      const raw = localStorage.getItem("theme");
      if (raw === "light" || raw === "dark") stored = raw;
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading persisted choice after mount, deliberately not during render
    setChoice(stored);

    // Keep following the OS while the choice is "system".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      try {
        if (!localStorage.getItem("theme")) apply("system");
      } catch {
        // ignore
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function pick(next: Choice) {
    setChoice(next);
    apply(next);
  }

  return (
    <div
      className="flex gap-0.5 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800"
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map((o) => {
        const active = choice === o.value;
        return (
          <button
            key={o.value}
            onClick={() => pick(o.value)}
            title={o.title}
            aria-label={o.title}
            aria-pressed={active}
            className={`rounded px-2 py-1 text-sm leading-none transition-colors ${
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
