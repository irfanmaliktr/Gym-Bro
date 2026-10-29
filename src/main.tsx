import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted fonts (offline mandate — replaces the Google Fonts <link> tags
// found in the Stitch references).
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import 'material-symbols/outlined.css'

import './styles/base.css'
import App from './App'
import { ToastProvider } from './components/ui/Toast'
import { AppDataProvider } from './data/AppDataContext'
import { FALLBACK_BOOTSTRAP, bootstrapDatabase, type BootstrapResult } from './db'
import { I18nProvider } from './i18n'

/**
 * Opens IndexedDB, seeds the built-in exercise catalog (EXER-001) and resolves
 * the persisted language/unit before React mounts, so the first paint already
 * uses the right language instead of flashing the default one.
 *
 * A storage failure must not produce a blank screen: the shell still renders
 * with PRD defaults, and the reason is logged for the user to report.
 *
 * Provider order matters:
 *   I18nProvider    – `initialLang` comes from the pre-mount read; every screen
 *                     (including the boot splash and toasts) can translate.
 *   ToastProvider   – action feedback, positioned above the shell.
 *   AppDataProvider – owns the single local snapshot; renders `AppBootScreen`
 *                     itself until the first read resolves, which is why the
 *                     profile gate can trust `profile === null` afterwards.
 */
async function start(): Promise<void> {
  let bootstrap: BootstrapResult = FALLBACK_BOOTSTRAP

  try {
    bootstrap = await bootstrapDatabase()
  } catch (error) {
    console.error('[gymbro] local database unavailable — starting with defaults', error)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider initialLang={bootstrap.language}>
        <ToastProvider>
          <AppDataProvider>
            <App />
          </AppDataProvider>
        </ToastProvider>
      </I18nProvider>
    </StrictMode>,
  )
}

void start()
