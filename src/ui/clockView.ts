import { getClockSnapshot, type ClockSnapshot } from '../domain/clockModel'
import {
  cycleAnalogStyle,
  cycleDigitalStyle,
} from '../domain/clockStyles'
import {
  cyclePomodoroDialStyle,
} from '../domain/pomodoroDial'
import {
  analogStyleLabel,
  digitalStyleLabel,
  pomodoroDialLabel,
  t,
} from '../i18n'
import { getDayProgress } from '../domain/dayProgress'
import type { CalendarScope, ClockSettings } from '../domain/settings'
import type { SessionSnapshot } from '../domain/sessionModel'
import { applyThemeVars, resolveTheme } from '../domain/themes'
import { createAnalogView, type AnalogView } from './analogView'
import { createCalendarView } from './calendarView'
import { createDigitalView } from './digitalView'
import { createMinutePicker } from './minutePicker'
import {
  createPomodoroCircleView,
  type PomodoroCircleView,
} from './pomodoroCircleView'

export type SessionControlsHandlers = {
  onToggle: () => void
  onReset: () => void
  onScrubMinutes: (minutes: number, phase: 'start' | 'move' | 'end') => void
  onOpenSettings: () => void
  getPomodoroMinutes: () => number
}

export type StyleSwipeHandler = (next: ClockSettings, label: string) => void
export type CalendarScopeHandler = (scope: CalendarScope) => void
export type OpenClockHandler = () => void

function usesDialVisual(settings: ClockSettings): boolean {
  return (
    (settings.appMode === 'pomodoro' || settings.appMode === 'stopwatch') &&
    (settings.mode === 'analog' || settings.mode === 'both')
  )
}

function usesMinutePicker(settings: ClockSettings): boolean {
  return settings.appMode === 'pomodoro' && settings.mode === 'digital'
}

function isSessionMode(settings: ClockSettings): boolean {
  return settings.appMode === 'pomodoro' || settings.appMode === 'stopwatch'
}

/** Two identical tiles so a -50% drift loops without a visible seam. */
function loopingWaveTrack(inner: string, viewBox: string): string {
  const svg = `<svg viewBox="${viewBox}" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`
  return `<div class="wave-track">${svg}${svg}</div>`
}

export function createClockView(root: HTMLElement) {
  root.innerHTML = `
    <div class="clock-root" data-mode="digital" data-app-mode="clock" data-pomodoro-visual="false">
      <div class="sky-window" hidden aria-hidden="true">
        <div class="sky-gradient"></div>
        <div class="scenic-stars"></div>
        <div class="sky-haze"></div>
        <div class="sky-sun"></div>
        <div class="sky-moon"></div>
        <div class="sky-glass"></div>
      </div>
      <div class="grove-window" hidden aria-hidden="true">
        <div class="grove-sky"></div>
        <div class="scenic-stars"></div>
        <div class="grove-canopy-wash"></div>
        <div class="grove-shafts"></div>
        <div class="grove-trees grove-trees-back">
          <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" d="M28 300 L48 168 L38 168 L62 110 L52 110 L78 48 L104 110 L94 110 L118 168 L108 168 L128 300 Z" />
            <path fill="currentColor" d="M150 300 L168 190 L158 190 L182 130 L172 130 L198 70 L224 130 L214 130 L238 190 L228 190 L246 300 Z" />
            <path fill="currentColor" d="M270 300 L288 175 L278 175 L302 112 L292 112 L318 50 L344 112 L334 112 L358 175 L348 175 L366 300 Z" />
            <path fill="currentColor" opacity="0.7" d="M90 300 L102 220 L96 220 L114 170 L108 170 L126 120 L144 170 L138 170 L156 220 L150 220 L162 300 Z" />
            <path fill="currentColor" opacity="0.65" d="M330 300 L342 230 L336 230 L352 180 L346 180 L362 135 L378 180 L372 180 L388 230 L382 230 L394 300 Z" />
          </svg>
        </div>
        <div class="grove-mist"></div>
        <div class="grove-trees grove-trees-mid">
          <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" d="M-10 300 L18 160 L6 160 L40 85 L28 85 L62 10 L96 85 L84 85 L118 160 L106 160 L134 300 Z" />
            <path fill="currentColor" d="M175 300 L198 155 L186 155 L220 78 L208 78 L242 8 L276 78 L264 78 L298 155 L286 155 L310 300 Z" />
            <path fill="currentColor" d="M340 300 L358 170 L348 170 L372 100 L362 100 L388 35 L414 100 L404 100 L428 170 L418 170 L436 300 Z" />
            <path fill="currentColor" opacity="0.85" d="M70 300 L88 200 L78 200 L102 140 L94 140 L118 85 L142 140 L134 140 L158 200 L148 200 L166 300 Z" />
            <path fill="currentColor" opacity="0.8" d="M250 300 L266 210 L258 210 L280 155 L272 155 L294 105 L316 155 L308 155 L330 210 L322 210 L338 300 Z" />
          </svg>
        </div>
        <div class="grove-ground"></div>
        <div class="grove-trees grove-trees-front">
          <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" d="M-30 300 L5 145 L-8 145 L30 60 L16 60 L55 -15 L94 60 L80 60 L118 145 L105 145 L140 300 Z" />
            <path fill="currentColor" d="M300 300 L328 140 L314 140 L350 55 L336 55 L372 -20 L408 55 L394 55 L430 140 L416 140 L450 300 Z" />
            <path fill="currentColor" opacity="0.9" d="M115 300 L132 195 L124 195 L148 130 L140 130 L164 70 L188 130 L180 130 L204 195 L196 195 L212 300 Z" />
            <ellipse cx="48" cy="292" rx="36" ry="10" fill="currentColor" opacity="0.25" />
            <ellipse cx="380" cy="292" rx="40" ry="11" fill="currentColor" opacity="0.22" />
          </svg>
        </div>
        <div class="grove-fireflies"></div>
        <div class="grove-veil"></div>
      </div>
      <div class="tide-window" hidden aria-hidden="true">
        <div class="tide-sky"></div>
        <div class="scenic-stars"></div>
        <div class="tide-horizon-glow"></div>
        <div class="tide-islands">
          <svg viewBox="0 0 400 80" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" opacity="0.45" d="M6 80 L32 56 Q42 44 54 56 L74 70 L96 42 Q108 30 122 44 L146 66 L164 52 Q174 44 186 56 L208 80 Z" />
            <path fill="currentColor" d="M58 80 L92 48 Q106 28 122 46 L148 70 L176 20 Q192 6 210 26 L244 60 L274 34 Q290 20 306 40 L338 72 L358 50 Q372 38 386 54 L400 80 Z" />
            <path fill="currentColor" opacity="0.72" d="M230 80 L252 58 Q264 44 278 58 L298 74 L318 50 Q330 38 344 52 L368 72 L384 62 Q392 56 400 64 L400 80 Z" />
          </svg>
        </div>
        <div class="tide-lighthouse" aria-hidden="true">
          <svg viewBox="0 0 140 320" preserveAspectRatio="xMidYMax meet">
            <path class="tide-beam" d="M78 52 L220 -8 L228 118 Z" />
            <path fill="currentColor" opacity="0.55" d="M18 320 L28 248 Q48 228 70 232 Q96 236 112 258 L122 320 Z" />
            <path fill="currentColor" d="M48 268 L56 78 H84 L92 268 Z" />
            <path fill="currentColor" opacity="0.22" d="M50 238 H90 L88.5 258 H51.5 Z" />
            <path fill="currentColor" opacity="0.22" d="M51.2 198 H88.8 L87.4 218 H52.6 Z" />
            <path fill="currentColor" opacity="0.22" d="M52.4 158 H87.6 L86.2 178 H53.8 Z" />
            <path fill="currentColor" opacity="0.22" d="M53.5 118 H86.5 L85.2 138 H54.8 Z" />
            <rect x="42" y="70" width="56" height="10" rx="1.5" fill="currentColor" />
            <rect class="tide-lantern" x="54" y="38" width="32" height="32" rx="3" />
            <path fill="currentColor" opacity="0.35" d="M54 54 H86 V70 H54 Z" />
            <path fill="currentColor" d="M48 40 L70 14 L92 40 Z" />
            <rect x="67" y="8" width="6" height="10" fill="currentColor" />
            <circle class="tide-lantern" cx="70" cy="54" r="6" />
          </svg>
        </div>
        <div class="tide-water"></div>
        <div class="tide-moon-path"></div>
        <div class="tide-sparkle"></div>
        <div class="tide-waves tide-waves-back">
          ${loopingWaveTrack(
            '<path fill="currentColor" d="M0 118 C133 72 267 72 400 118 S667 164 800 118 V200 H0 Z" />',
            '0 0 800 200',
          )}
        </div>
        <div class="tide-waves tide-waves-mid">
          ${loopingWaveTrack(
            '<path fill="currentColor" d="M0 132 C67 88 133 88 200 132 S333 176 400 132 S533 88 600 132 S733 176 800 132 V200 H0 Z" />',
            '0 0 800 200',
          )}
        </div>
        <div class="tide-waves tide-waves-front">
          ${loopingWaveTrack(
            '<path fill="currentColor" opacity="0.92" d="M0 148 C67 108 133 108 200 148 S333 188 400 148 S533 108 600 148 S733 188 800 148 V200 H0 Z" /><path fill="currentColor" opacity="0.38" d="M0 172 C67 154 133 154 200 172 S333 190 400 172 S533 154 600 172 S733 190 800 172 V200 H0 Z" />',
            '0 0 800 200',
          )}
        </div>
        <div class="tide-veil"></div>
      </div>
      <div class="island-window" hidden aria-hidden="true">
        <div class="island-sky"></div>
        <div class="scenic-stars"></div>
        <div class="island-glow"></div>
        <div class="island-lagoon"></div>
        <div class="island-sparkle"></div>
        <div class="island-ripples island-ripples-back">
          ${loopingWaveTrack(
            '<path fill="currentColor" d="M0 72 C133 48 267 48 400 72 S667 96 800 72 V120 H0 Z" />',
            '0 0 800 120',
          )}
        </div>
        <div class="island-ripples island-ripples-front">
          ${loopingWaveTrack(
            '<path fill="currentColor" opacity="0.85" d="M0 82 C67 62 133 62 200 82 S333 102 400 82 S533 62 600 82 S733 102 800 82 V120 H0 Z" />',
            '0 0 800 120',
          )}
        </div>
        <div class="island-sand"></div>
        <div class="island-rock">
          <svg viewBox="0 0 200 90" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <ellipse cx="100" cy="78" rx="88" ry="14" fill="currentColor" opacity="0.35" />
            <path fill="currentColor" d="M28 82 Q48 28 78 18 Q108 8 128 22 Q148 36 158 58 Q168 72 172 82 Z" />
            <path fill="currentColor" opacity="0.75" d="M92 82 Q98 42 112 34 Q126 26 138 38 Q150 50 152 68 Q154 76 156 82 Z" />
          </svg>
        </div>
        <div class="island-palms island-palms-left">
          <svg viewBox="0 0 120 280" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" d="M58 280 L62 148 L58 148 L64 88 L60 88 L68 18 L76 88 L72 88 L78 148 L74 148 L78 280 Z" />
            <path fill="currentColor" opacity="0.85" d="M68 92 Q20 72 8 48 Q28 58 52 78 Q38 52 18 28 Q44 44 58 68 Q48 38 32 12 Q56 32 68 58 Q62 28 58 0 Q72 28 78 58 Q92 32 108 12 Q88 38 78 68 Q102 44 118 28 Q98 52 84 78 Q108 58 128 48 Q116 72 68 92 Z" />
          </svg>
        </div>
        <div class="island-palms island-palms-right">
          <svg viewBox="0 0 120 280" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" d="M58 280 L62 148 L58 148 L64 88 L60 88 L68 18 L76 88 L72 88 L78 148 L74 148 L78 280 Z" />
            <path fill="currentColor" opacity="0.85" d="M68 92 Q20 72 8 48 Q28 58 52 78 Q38 52 18 28 Q44 44 58 68 Q48 38 32 12 Q56 32 68 58 Q62 28 58 0 Q72 28 78 58 Q92 32 108 12 Q88 38 78 68 Q102 44 118 28 Q98 52 84 78 Q108 58 128 48 Q116 72 68 92 Z" />
          </svg>
        </div>
        <div class="island-veil"></div>
      </div>
      <div class="beach-window" hidden aria-hidden="true">
        <div class="beach-sky"></div>
        <div class="scenic-stars"></div>
        <div class="beach-glow"></div>
        <div class="beach-sea"></div>
        <div class="beach-sparkle"></div>
        <div class="beach-ripples beach-ripples-back">
          ${loopingWaveTrack(
            '<path fill="currentColor" d="M0 72 C133 50 267 50 400 72 S667 94 800 72 V120 H0 Z" />',
            '0 0 800 120',
          )}
        </div>
        <div class="beach-ripples beach-ripples-front">
          ${loopingWaveTrack(
            '<path fill="currentColor" opacity="0.88" d="M0 82 C67 64 133 64 200 82 S333 100 400 82 S533 64 600 82 S733 100 800 82 V120 H0 Z" />',
            '0 0 800 120',
          )}
        </div>
        <div class="beach-dunes">
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true">
            <path fill="currentColor" d="M0 80 C40 52 90 58 140 48 C190 38 230 58 280 46 C330 34 370 50 400 44 V80 Z" />
          </svg>
        </div>
        <div class="beach-sand"></div>
        <div class="beach-grass beach-grass-left">
          <svg viewBox="0 0 80 90" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" d="M18 90 C20 60 8 38 12 12 C22 36 24 58 22 90 Z" />
            <path fill="currentColor" opacity="0.85" d="M32 90 C30 58 36 32 28 6 C40 30 42 56 40 90 Z" />
            <path fill="currentColor" opacity="0.7" d="M46 90 C48 62 58 40 62 14 C54 38 52 62 50 90 Z" />
          </svg>
        </div>
        <div class="beach-grass beach-grass-right">
          <svg viewBox="0 0 80 90" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" d="M18 90 C20 60 8 38 12 12 C22 36 24 58 22 90 Z" />
            <path fill="currentColor" opacity="0.85" d="M32 90 C30 58 36 32 28 6 C40 30 42 56 40 90 Z" />
            <path fill="currentColor" opacity="0.7" d="M46 90 C48 62 58 40 62 14 C54 38 52 62 50 90 Z" />
          </svg>
        </div>
        <div class="beach-umbrellas">
          <svg viewBox="0 0 220 140" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <path fill="currentColor" opacity="0.35" d="M48 138 L52 62" stroke="currentColor" stroke-width="3" />
            <path fill="currentColor" d="M18 68 Q52 18 86 68 Q52 58 18 68 Z" />
            <path fill="currentColor" opacity="0.28" d="M52 62 L52 138" stroke="currentColor" stroke-width="3" />
            <path fill="currentColor" opacity="0.35" d="M148 138 L154 70" stroke="currentColor" stroke-width="3" />
            <path fill="currentColor" d="M112 76 Q154 22 196 76 Q154 66 112 76 Z" />
            <path fill="currentColor" opacity="0.22" d="M70 132 Q88 124 108 132 Q88 128 70 132 Z" />
            <path fill="currentColor" opacity="0.22" d="M168 132 Q186 124 206 132 Q186 128 168 132 Z" />
          </svg>
        </div>
        <div class="beach-veil"></div>
      </div>
      <div class="nook-window" hidden aria-hidden="true">
        <div class="nook-wall"></div>
        <div class="nook-wainscot"></div>
        <div class="nook-pane">
          <div class="nook-sky"></div>
          <div class="scenic-stars"></div>
        </div>
        <div class="nook-frame">
          <svg viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true">
            <rect x="3" y="3" width="194" height="114" fill="none" stroke="currentColor" stroke-width="10" />
            <rect x="97" y="3" width="6" height="114" fill="currentColor" />
            <rect x="3" y="57" width="194" height="6" fill="currentColor" />
            <rect x="3" y="106" width="194" height="11" fill="currentColor" />
          </svg>
        </div>
        <div class="nook-floor"></div>
        <div class="nook-lamp-glow"></div>
        <div class="nook-desk-scene">
          <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <g class="nook-wood" opacity="0.55">
              <path d="M168 148 L176 168 H196 L188 236 H172 L164 168 Z" />
              <path d="M284 148 L292 168 H308 L300 228 H286 L280 168 Z" />
            </g>
            <g class="nook-wood">
              <ellipse cx="240" cy="272" rx="168" ry="16" opacity="0.28" />
              <path d="M86 168 L96 268 H114 L104 168 Z" />
              <path d="M366 168 L376 268 H394 L384 168 Z" />
              <path d="M58 148 L422 148 L404 172 L76 172 Z" />
              <path d="M48 128 L432 128 L422 148 L58 148 Z" />
              <path opacity="0.22" d="M70 132 L420 132 L418 138 L72 138 Z" />
            </g>
            <g class="nook-plant">
              <path class="nook-wood" d="M78 128 L86 92 H118 L126 128 Z" />
              <ellipse class="nook-wood" cx="102" cy="92" rx="22" ry="6" />
              <path d="M92 92 C70 70 52 48 64 18 C86 42 90 68 96 92 Z" />
              <path opacity="0.88" d="M102 90 C108 58 128 32 118 4 C104 28 100 58 100 90 Z" />
              <path opacity="0.74" d="M112 92 C136 72 158 50 152 22 C130 44 122 70 116 92 Z" />
              <path opacity="0.62" d="M86 88 C62 64 48 40 58 16 C76 38 82 62 88 88 Z" />
              <path opacity="0.8" d="M108 86 C122 54 146 36 138 8 C118 30 110 56 106 86 Z" />
            </g>
            <g class="nook-book">
              <rect x="148" y="108" width="42" height="20" rx="1.5" />
              <rect x="154" y="98" width="40" height="18" rx="1.5" opacity="0.82" />
            </g>
            <g class="nook-lamp-shade">
              <rect class="nook-wood" x="368" y="78" width="8" height="50" rx="1" />
              <ellipse class="nook-wood" cx="372" cy="128" rx="16" ry="5" />
              <path d="M346 78 L372 38 L398 78 Z" />
            </g>
          </svg>
        </div>
        <div class="nook-veil"></div>
      </div>
      <div class="date-label" hidden></div>
      <div class="clock-stage">
        <div class="mode-label" hidden></div>
        <div class="analog-host"></div>
        <div class="pomodoro-host"></div>
        <div class="calendar-host"></div>
        <div class="digital-clock" aria-live="polite">
          <span class="time">00:00</span>
        </div>
        <div class="day-progress" hidden>
          <div class="day-progress-track" aria-hidden="true">
            <div class="day-progress-fill"></div>
          </div>
          <span class="day-progress-value">0%</span>
        </div>
        <div class="session-status session-status-outer" hidden></div>
      </div>
      <div class="session-controls" hidden>
        <button type="button" class="session-btn primary" data-action="toggle">${t('session.start')}</button>
        <button type="button" class="session-btn" data-action="reset">${t('session.reset')}</button>
      </div>
      <div class="style-toast" hidden>
        <span class="style-toast-label"></span>
      </div>
      <div class="style-nav">
        <button type="button" class="style-nav-edge style-nav-edge-prev" aria-label="${t('nav.prevDesign')}"></button>
        <button type="button" class="style-nav-arrow style-nav-prev" aria-label="${t('nav.prevDesign')}">‹</button>
        <button type="button" class="style-nav-settings" aria-label="${t('nav.settings')}">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.77 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.89 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"
            />
          </svg>
        </button>
        <button type="button" class="style-nav-arrow style-nav-next" aria-label="${t('nav.nextDesign')}">›</button>
        <button type="button" class="style-nav-edge style-nav-edge-next" aria-label="${t('nav.nextDesign')}"></button>
      </div>
      <div class="hint">${t('hints.tapStyle')}</div>
      <div class="settings-host"></div>
    </div>
  `

  const clockRoot = root.querySelector('.clock-root') as HTMLElement
  const skyWindowEl = root.querySelector('.sky-window') as HTMLElement
  const groveWindowEl = root.querySelector('.grove-window') as HTMLElement
  const tideWindowEl = root.querySelector('.tide-window') as HTMLElement
  const islandWindowEl = root.querySelector('.island-window') as HTMLElement
  const beachWindowEl = root.querySelector('.beach-window') as HTMLElement
  const nookWindowEl = root.querySelector('.nook-window') as HTMLElement
  const digitalEl = root.querySelector('.digital-clock') as HTMLElement
  const dateEl = root.querySelector('.date-label') as HTMLElement
  const dayProgressEl = root.querySelector('.day-progress') as HTMLElement
  const dayProgressFill = root.querySelector('.day-progress-fill') as HTMLElement
  const dayProgressValue = root.querySelector('.day-progress-value') as HTMLElement
  const modeLabelEl = root.querySelector('.mode-label') as HTMLElement
  const statusEl = root.querySelector('.session-status') as HTMLElement
  const controlsEl = root.querySelector('.session-controls') as HTMLElement
  const toggleBtn = root.querySelector('[data-action="toggle"]') as HTMLButtonElement
  const resetBtn = root.querySelector('[data-action="reset"]') as HTMLButtonElement
  const analogHost = root.querySelector('.analog-host') as HTMLElement
  const pomodoroHost = root.querySelector('.pomodoro-host') as HTMLElement
  const calendarHost = root.querySelector('.calendar-host') as HTMLElement
  const settingsHost = root.querySelector('.settings-host') as HTMLElement
  const hintEl = root.querySelector('.hint') as HTMLElement
  const toastEl = root.querySelector('.style-toast') as HTMLElement
  const toastLabel = root.querySelector('.style-toast-label') as HTMLElement
  const styleNavEl = root.querySelector('.style-nav') as HTMLElement
  const styleNavPrev = root.querySelector('.style-nav-prev') as HTMLButtonElement
  const styleNavNext = root.querySelector('.style-nav-next') as HTMLButtonElement
  const styleNavEdgePrev = root.querySelector('.style-nav-edge-prev') as HTMLButtonElement
  const styleNavEdgeNext = root.querySelector('.style-nav-edge-next') as HTMLButtonElement
  const styleNavSettings = root.querySelector('.style-nav-settings') as HTMLButtonElement

  const analog: AnalogView = createAnalogView(analogHost)
  const digital = createDigitalView(digitalEl)
  const pomodoroCircle: PomodoroCircleView = createPomodoroCircleView(pomodoroHost)
  const calendar = createCalendarView(calendarHost)

  const center = document.createElement('div')
  center.className = 'pomodoro-center'
  center.hidden = true
  pomodoroCircle.el.appendChild(center)

  let handlers: SessionControlsHandlers | null = null
  let onStyleSwipe: StyleSwipeHandler | null = null
  let onCalendarScope: CalendarScopeHandler | null = null
  let onOpenClock: OpenClockHandler | null = null
  let latestSettings: ClockSettings | null = null
  let toastTimer: number | null = null
  let styleNavTimer: number | null = null
  let suppressClick = false

  const minutePicker = createMinutePicker({
    host: clockRoot,
    getMinutes: () => handlers?.getPomodoroMinutes() ?? 25,
    onChange: (minutes, phase) => handlers?.onScrubMinutes(minutes, phase),
  })

  controlsEl.addEventListener('click', (e) => {
    e.stopPropagation()
    const target = e.target as HTMLElement
    const action = target.closest('[data-action]')?.getAttribute('data-action')
    if (!handlers || !action) return
    if (action === 'toggle') handlers.onToggle()
    if (action === 'reset') handlers.onReset()
  })
  controlsEl.addEventListener('pointerdown', (e) => e.stopPropagation())

  digitalEl.addEventListener('click', (e) => {
    if (!latestSettings || !usesMinutePicker(latestSettings)) return
    e.stopPropagation()
    minutePicker.toggle(digitalEl)
  })
  digitalEl.addEventListener('pointerdown', (e) => {
    if (!latestSettings || !usesMinutePicker(latestSettings)) return
    e.stopPropagation()
  })

  calendar.el.addEventListener('calendar:open-month', ((e: CustomEvent) => {
    const { year, month } = e.detail as { year: number; month: number }
    calendar.setCursor(new Date(year, month, 1))
    onCalendarScope?.('month')
  }) as EventListener)

  calendar.el.addEventListener('calendar:open-year', (() => {
    onCalendarScope?.('year')
  }) as EventListener)

  calendar.el.addEventListener('calendar:open-clock', (() => {
    onOpenClock?.()
  }) as EventListener)

  function updateDayProgress(
    date: Date,
    visible: boolean,
    showPercent: boolean,
  ) {
    dayProgressEl.hidden = !visible
    dayProgressEl.classList.toggle('no-percent', !showPercent)
    dayProgressValue.hidden = !showPercent
    if (!visible) return
    const progress = getDayProgress(date)
    dayProgressFill.style.transform = `scaleX(${progress.ratio})`
    if (showPercent) dayProgressValue.textContent = progress.label
    dayProgressEl.setAttribute('aria-valuenow', String(Math.round(progress.ratio * 100)))
  }

  function applyTheme(settings: ClockSettings, now: Date = new Date()) {
    const theme = resolveTheme(settings, now)
    applyThemeVars(theme, document.documentElement)
    applyThemeVars(theme, clockRoot)
    document.documentElement.dataset.digitalStyle = settings.digitalStyle
    document.documentElement.dataset.analogStyle = settings.analogStyle
    const isSkylight = theme.id === 'skylight' && Boolean(theme.sky)
    const isGrove = theme.id === 'grove' && Boolean(theme.forest)
    const isTide = theme.id === 'tide' && Boolean(theme.ocean)
    const isIsland = theme.id === 'island' && Boolean(theme.island)
    const isBeach = theme.id === 'beach' && Boolean(theme.beach)
    const isNook = theme.id === 'nook' && Boolean(theme.nook)
    skyWindowEl.hidden = !isSkylight
    groveWindowEl.hidden = !isGrove
    tideWindowEl.hidden = !isTide
    islandWindowEl.hidden = !isIsland
    beachWindowEl.hidden = !isBeach
    syncBeach3D(isBeach ? theme.beach!.hour : null)
    nookWindowEl.hidden = !isNook
  }

  // The beach theme draws an animated 3D scene over its 2D layers once WebGL is up.
  let beach3d: import('../scene3d/beach3d').Beach3D | null = null
  let beach3dLoading = false
  let beachHour: number | null = null
  function syncBeach3D(hour: number | null) {
    beachHour = hour
    if (beach3d) {
      if (hour != null) beach3d.setHour(hour)
      beach3d.setActive(hour != null)
      return
    }
    if (hour == null || beach3dLoading) return
    beach3dLoading = true
    void import('../scene3d/beach3d').then(({ mountBeach3D, supportsWebGL }) => {
      if (!supportsWebGL()) return
      beach3d = mountBeach3D(beachWindowEl, () => beachWindowEl.classList.add('is-3d'))
      syncBeach3D(beachHour)
    })
  }

  function placeDigitalInStage() {
    const stage = clockRoot.querySelector('.clock-stage') as HTMLElement
    if (digitalEl.parentElement !== stage) {
      const progressNode = stage.querySelector('.day-progress')
      stage.insertBefore(digitalEl, progressNode)
    }
    if (statusEl.parentElement !== stage) {
      stage.appendChild(statusEl)
    }
    center.hidden = true
  }

  function placeDigitalInCircle() {
    if (digitalEl.parentElement !== center) {
      center.appendChild(digitalEl)
    }
    if (statusEl.parentElement !== center) {
      center.appendChild(statusEl)
    }
    center.hidden = false
  }

  function updateChromeLabels(settings: ClockSettings) {
    styleNavEl.querySelectorAll<HTMLElement>('.style-nav-edge-prev, .style-nav-prev').forEach((el) => {
      el.setAttribute('aria-label', t('nav.prevDesign'))
    })
    styleNavEl.querySelectorAll<HTMLElement>('.style-nav-edge-next, .style-nav-next').forEach((el) => {
      el.setAttribute('aria-label', t('nav.nextDesign'))
    })
    styleNavEl.querySelector('.style-nav-settings')?.setAttribute('aria-label', t('nav.settings'))
    resetBtn.textContent = t('session.reset')
    minutePicker.refreshLabels()
    updateHint(settings)
    if (latestSession) {
      updateSessionButtons(latestSession)
    }
  }

  function updateSessionButtons(session: SessionSnapshot) {
    toggleBtn.textContent = session.running
      ? t('session.pause')
      : session.completed
        ? t('session.resume')
        : t('session.start')
  }

  let latestSession: SessionSnapshot | null = null

  function updateHint(settings: ClockSettings) {
    if (settings.appMode === 'calendar' || isSessionMode(settings)) {
      hintEl.textContent = ''
      hintEl.hidden = true
      return
    }
    if (usesDialVisual(settings)) {
      hintEl.hidden = false
      hintEl.textContent = t('hints.centerSettings')
    } else if (usesMinutePicker(settings)) {
      hintEl.hidden = false
      hintEl.textContent = t('hints.tapDigits')
    } else if (settings.appMode === 'clock') {
      hintEl.hidden = false
      hintEl.textContent = t('hints.tapSettings')
    } else {
      hintEl.hidden = false
      hintEl.textContent = t('hints.tapToSettings')
    }
  }

  function showStyleNavBriefly(durationMs = 2800) {
    if (
      latestSettings &&
      latestSettings.appMode !== 'clock' &&
      !isSessionMode(latestSettings)
    ) {
      styleNavEl.classList.remove('is-visible')
      return
    }
    styleNavEl.classList.add('is-visible')
    if (styleNavTimer !== null) window.clearTimeout(styleNavTimer)
    styleNavTimer = window.setTimeout(() => {
      styleNavEl.classList.remove('is-visible')
      styleNavTimer = null
    }, durationMs)
  }

  function showStyleToast(label: string) {
    toastLabel.textContent = label
    toastEl.hidden = false
    toastEl.classList.add('is-visible')
    showStyleNavBriefly(2200)
    if (toastTimer !== null) window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove('is-visible')
      toastTimer = window.setTimeout(() => {
        toastEl.hidden = true
        toastTimer = null
      }, 280)
    }, 1600)
  }

  function applySettingsChrome(settings: ClockSettings, now: Date = new Date()) {
    latestSettings = settings
    applyTheme(settings, now)
    clockRoot.dataset.mode = settings.mode
    clockRoot.dataset.appMode = settings.appMode
    const visual = usesDialVisual(settings)
    clockRoot.dataset.pomodoroVisual = String(visual)
    updateChromeLabels(settings)

    const isClock = settings.appMode === 'clock'
    const isCalendar = settings.appMode === 'calendar'
    const showAnalog = isClock && (settings.mode === 'analog' || settings.mode === 'both')
    const showSessionDigital =
      isSessionMode(settings) && (settings.mode === 'digital' || settings.mode === 'both')
    const showDigital = isClock
      ? settings.mode === 'digital' || settings.mode === 'both'
      : showSessionDigital || visual

    analog.setVisible(showAnalog && !isCalendar)
    pomodoroCircle.setVisible(visual && !isCalendar)
    calendar.setVisible(isCalendar)

    if (isCalendar) {
      placeDigitalInStage()
      digitalEl.hidden = true
      dateEl.hidden = true
      dayProgressEl.hidden = true
      modeLabelEl.hidden = true
      statusEl.hidden = true
      controlsEl.hidden = true
      digitalEl.classList.remove('is-pomodoro-digital')
      if (minutePicker.isOpen()) minutePicker.close()
      return
    }

    dayProgressEl.hidden = !isClock || !settings.showDayProgress

    if (visual) {
      placeDigitalInCircle()
      digitalEl.hidden = settings.mode === 'analog'
      statusEl.hidden = false
    } else {
      placeDigitalInStage()
      digitalEl.hidden = !showDigital
      statusEl.hidden = isClock
    }

    digitalEl.classList.toggle('is-secondary', isClock && settings.mode === 'both')
    digitalEl.classList.toggle('is-session', isSessionMode(settings))
    digitalEl.classList.toggle('is-12h', isClock && settings.hourFormat === '12h')
    digitalEl.classList.toggle('is-pomodoro-digital', usesMinutePicker(settings))
    dateEl.hidden = !isClock || !settings.showDate
    modeLabelEl.hidden = isClock
    controlsEl.hidden = !isSessionMode(settings)
    if (!visual) {
      statusEl.hidden = !isSessionMode(settings)
    }

    if (!usesMinutePicker(settings) && minutePicker.isOpen()) {
      minutePicker.close()
    }
  }

  function renderClock(settings: ClockSettings, date: Date) {
    latestSession = null
    calendar.setVisible(false)
    pomodoroCircle.setVisible(false)
    placeDigitalInStage()
    if (minutePicker.isOpen()) minutePicker.close()
    digitalEl.classList.remove('is-pomodoro-digital')

    const snapshot: ClockSnapshot = getClockSnapshot(date, {
      showSeconds: settings.showSeconds,
      hourFormat: settings.hourFormat,
      dateFormat: settings.dateFormat,
    })

    const showDigital = settings.mode === 'digital' || settings.mode === 'both'
    if (showDigital) {
      digital.update(snapshot, {
        style: settings.digitalStyle,
        showSeconds: settings.showSeconds,
        structured: true,
      })
    }

    dateEl.textContent = snapshot.dateLabel
    modeLabelEl.textContent = ''
    statusEl.textContent = ''
    digitalEl.classList.remove('is-session', 'is-complete')
    digitalEl.classList.toggle('is-12h', settings.hourFormat === '12h')
    updateDayProgress(date, settings.showDayProgress, settings.showDayProgressPercent)

    if (settings.mode === 'analog' || settings.mode === 'both') {
      analog.update(snapshot, {
        style: settings.analogStyle,
        showSeconds: settings.showSeconds,
      })
    }
  }

  function renderCalendar(settings: ClockSettings, date: Date) {
    analog.setVisible(false)
    pomodoroCircle.setVisible(false)
    digitalEl.hidden = true
    dateEl.hidden = true
    dayProgressEl.hidden = true
    modeLabelEl.hidden = true
    statusEl.hidden = true
    controlsEl.hidden = true
    if (minutePicker.isOpen()) minutePicker.close()
    digitalEl.classList.remove('is-pomodoro-digital')
    calendar.setVisible(true)
    calendar.update({ scope: settings.calendarScope, today: date })
  }

  function renderSession(settings: ClockSettings, session: SessionSnapshot) {
    latestSession = session
    calendar.setVisible(false)
    dayProgressEl.hidden = true
    const visual = usesDialVisual(settings)

    modeLabelEl.hidden = false
    statusEl.hidden = false
    controlsEl.hidden = false
    analog.setVisible(false)
    digitalEl.hidden = false
    digitalEl.classList.add('is-session')
    digitalEl.classList.toggle('is-complete', session.completed)
    digitalEl.classList.remove('is-secondary')
    dateEl.hidden = true

    if (visual) {
      placeDigitalInCircle()
      pomodoroCircle.setVisible(true)
      pomodoroCircle.update(session, { dialStyle: settings.pomodoroDialStyle })
      digitalEl.hidden = settings.mode === 'analog'
      statusEl.hidden = false
    } else {
      pomodoroCircle.setVisible(false)
      placeDigitalInStage()
      digitalEl.hidden = false
      statusEl.hidden = false
    }

    const pickerOk = usesMinutePicker(settings) && !digitalEl.hidden
    digitalEl.classList.toggle('is-pomodoro-digital', pickerOk)
    if (!pickerOk && minutePicker.isOpen()) minutePicker.close()
    else if (pickerOk) minutePicker.setMinutes(Math.round(session.durationMs / 60_000))

    modeLabelEl.textContent = session.label

    // Idle digital pomodoro shows set duration; picker edits this value.
    const digitalTime =
      pickerOk && !session.running && !session.completed && session.elapsedMs === 0
        ? `${String(Math.round(session.durationMs / 60_000)).padStart(2, '0')}:00`
        : session.primaryText

    const plain: ClockSnapshot = {
      hours: 0,
      minutes: 0,
      seconds: 0,
      hours12: 0,
      padHours: '00',
      padMinutes: '00',
      padSeconds: '00',
      period: '',
      digitalTime,
      dateLabel: '',
      hourAngle: 0,
      minuteAngle: 0,
      secondAngle: 0,
    }
    digital.update(plain, {
      style: settings.digitalStyle,
      showSeconds: false,
      structured: false,
    })

    statusEl.textContent = session.statusText
    updateSessionButtons(session)
    toggleBtn.disabled = false
    resetBtn.disabled = session.elapsedMs <= 0 && !session.running && !session.completed
  }

  function render(
    settings: ClockSettings,
    date: Date = new Date(),
    session?: SessionSnapshot | null,
  ) {
    applySettingsChrome(settings, date)
    if (settings.appMode === 'calendar') {
      renderCalendar(settings, date)
      return
    }
    if (settings.appMode === 'clock' || !session) {
      renderClock(settings, date)
      return
    }
    renderSession(settings, session)
  }

  function showHintBriefly() {
    if (latestSettings && isSessionMode(latestSettings)) {
      return
    }
    clockRoot.classList.add('show-hint')
    if (latestSettings?.appMode === 'clock') {
      showStyleNavBriefly(3200)
    }
    window.setTimeout(() => clockRoot.classList.remove('show-hint'), 3200)
  }

  function setSessionHandlers(next: SessionControlsHandlers) {
    handlers = next
    pomodoroCircle.setOnScrub((minutes, phase) => {
      handlers?.onScrubMinutes(minutes, phase)
    })
    pomodoroCircle.setOnKnobTap(() => {
      handlers?.onOpenSettings()
    })
    pomodoroCircle.setOnStyleSwipe((dir) => {
      cycleStyle(dir)
    })
    calendar.setHandlers({
      onOpenSettings: () => handlers?.onOpenSettings(),
    })
  }

  function setStyleSwipeHandler(handler: StyleSwipeHandler | null) {
    onStyleSwipe = handler
  }

  function setCalendarScopeHandler(handler: CalendarScopeHandler | null) {
    onCalendarScope = handler
  }

  function setOpenClockHandler(handler: OpenClockHandler | null) {
    onOpenClock = handler
  }

  function cycleStyle(dir: 1 | -1) {
    const settings = latestSettings
    if (!settings || !onStyleSwipe) return
    if (settings.appMode === 'calendar') return

    let next = { ...settings }
    let label = ''

    if (settings.appMode === 'clock') {
      if (settings.mode === 'digital') {
        next.digitalStyle = cycleDigitalStyle(settings.digitalStyle, dir)
        label = digitalStyleLabel(next.digitalStyle)
      } else if (settings.mode === 'analog') {
        next.analogStyle = cycleAnalogStyle(settings.analogStyle, dir)
        label = analogStyleLabel(next.analogStyle)
      } else {
        next.digitalStyle = cycleDigitalStyle(settings.digitalStyle, dir)
        next.analogStyle = cycleAnalogStyle(settings.analogStyle, dir)
        label = `${analogStyleLabel(next.analogStyle)} · ${digitalStyleLabel(next.digitalStyle)}`
      }
    } else if (usesDialVisual(settings)) {
      next.pomodoroDialStyle = cyclePomodoroDialStyle(settings.pomodoroDialStyle, dir)
      label = pomodoroDialLabel(next.pomodoroDialStyle)
    } else {
      next.digitalStyle = cycleDigitalStyle(settings.digitalStyle, dir)
      label = digitalStyleLabel(next.digitalStyle)
    }

    showStyleToast(label)
    onStyleSwipe(next, label)
  }

  styleNavPrev.addEventListener('pointerdown', (e) => e.stopPropagation())
  styleNavNext.addEventListener('pointerdown', (e) => e.stopPropagation())
  styleNavEdgePrev.addEventListener('pointerdown', (e) => e.stopPropagation())
  styleNavEdgeNext.addEventListener('pointerdown', (e) => e.stopPropagation())
  styleNavSettings.addEventListener('pointerdown', (e) => e.stopPropagation())

  function bindStyleCycle(el: HTMLElement, dir: 1 | -1) {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      cycleStyle(dir)
    })
  }
  bindStyleCycle(styleNavPrev, -1)
  bindStyleCycle(styleNavNext, 1)
  bindStyleCycle(styleNavEdgePrev, -1)
  bindStyleCycle(styleNavEdgeNext, 1)

  styleNavSettings.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    handlers?.onOpenSettings()
  })

  {
    let startX = 0
    let startY = 0
    let tracking = false
    let pointerId: number | null = null

    clockRoot.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return
      const t = e.target as HTMLElement
      if (
        t.closest('.settings-sheet') ||
        t.closest('.session-controls') ||
        t.closest('.pomodoro-timer-wrap') ||
        t.closest('.is-minute-scroll') ||
        t.closest('.style-nav-arrow') ||
        t.closest('.style-nav-edge') ||
        t.closest('.style-nav-settings') ||
        t.closest('.calendar-root') ||
        t.closest('.minute-picker')
      ) {
        return
      }
      tracking = true
      pointerId = e.pointerId
      startX = e.clientX
      startY = e.clientY
    })

    clockRoot.addEventListener('pointerup', (e) => {
      if (!tracking || e.pointerId !== pointerId) return
      tracking = false
      pointerId = null
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.35) return
      suppressClick = true
      window.setTimeout(() => {
        suppressClick = false
      }, 320)
      cycleStyle(dx < 0 ? 1 : -1)
    })

    clockRoot.addEventListener('pointercancel', () => {
      tracking = false
      pointerId = null
    })

    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null
      if (
        target?.closest('input, select, textarea, [contenteditable="true"]') ||
        clockRoot.querySelector('.settings-sheet.open')
      ) {
        return
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (!latestSettings || !isSessionMode(latestSettings)) return
        e.preventDefault()
        handlers?.onToggle()
        return
      }

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      if (latestSettings?.appMode === 'calendar') {
        calendar.step(e.key === 'ArrowRight' ? 1 : -1)
        return
      }
      cycleStyle(e.key === 'ArrowRight' ? 1 : -1)
    })
  }

  function consumeSwipeClick(): boolean {
    if (!suppressClick) return false
    suppressClick = false
    return true
  }

  return {
    clockRoot,
    settingsHost,
    controlsEl,
    get timeEl() {
      return digital.getTimeEl()
    },
    render,
    applySettingsChrome,
    showHintBriefly,
    setSessionHandlers,
    setStyleSwipeHandler,
    setCalendarScopeHandler,
    setOpenClockHandler,
    consumeSwipeClick,
    closeMinutePicker: () => {
      if (minutePicker.isOpen()) minutePicker.close()
    },
    isMinutePickerOpen: () => minutePicker.isOpen(),
  }
}

export type ClockView = ReturnType<typeof createClockView>
