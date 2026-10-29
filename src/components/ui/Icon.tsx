interface IconProps {
  /** Material Symbols ligature name (e.g. "fitness_center"). */
  name: string
  /** Render the filled variant (design uses `font-variation-settings: 'FILL' 1`). */
  fill?: boolean
  className?: string
}

/**
 * Thin wrapper around the Material Symbols icon font.
 * Kept as a component so icon usage stays consistent across the app and
 * so the FILL axis state is set in one place.
 */
export function Icon({ name, fill = false, className = '' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={{
        fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
        /*
         * Icon-font FOUT guard: until the 3.8 MB Material Symbols woff2 is
         * loaded the browser renders the raw ligature name as text (the word
         * "fitness_center" measures ~212px), which briefly made the document
         * wider than the viewport. Every Material Symbols glyph has an exact
         * 1em advance, so pinning the box to 1em is a no-op after the font
         * loads and clips the fallback text before it does.
         *
         * `min-width`/`min-height` are required next to `overflow: hidden`:
         * clipping removes the automatic minimum size of a flex item, which
         * let tight rows (e.g. the resume banner's buttons) squeeze the glyph
         * below 1em. The minimums restore that protection.
         */
        display: 'inline-block',
        width: '1em',
        height: '1em',
        minWidth: '1em',
        minHeight: '1em',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
