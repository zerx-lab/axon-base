"use client";

import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-mono text-lg font-medium uppercase tracking-wider">
          {t("settings.title")}
        </h1>
      </div>

      <div className="max-w-xl space-y-8">
        {/* Language Setting */}
        <div className="border border-border p-6">
          <h2 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-muted">
            {t("settings.language")}
          </h2>
          <div className="flex gap-3">
            <OptionButton
              selected={locale === "zh"}
              onClick={() => setLocale("zh")}
              label="中文"
            />
            <OptionButton
              selected={locale === "en"}
              onClick={() => setLocale("en")}
              label="English"
            />
          </div>
        </div>

        {/* Theme Setting */}
        <div className="border border-border p-6">
          <h2 className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-muted">
            {t("settings.theme")}
          </h2>
          <div className="flex gap-3">
            <OptionButton
              selected={theme === "light"}
              onClick={() => setTheme("light")}
              label={t("settings.themeLight")}
              icon={<SunIcon />}
            />
            <OptionButton
              selected={theme === "dark"}
              onClick={() => setTheme("dark")}
              label={t("settings.themeDark")}
              icon={<MoonIcon />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface OptionButtonProps {
  readonly selected: boolean;
  readonly onClick: () => void;
  readonly label: string;
  readonly icon?: React.ReactNode;
}

function OptionButton({ selected, onClick, label, icon }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex h-10 items-center gap-2 border px-4 font-mono text-xs uppercase tracking-wider transition-colors ${
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted hover:border-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
