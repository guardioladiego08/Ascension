# Executive Design Summary

Use a low-glare charcoal foundation with one high-energy accent trio at a time, generous spacing, dense numeric hierarchy, and progress widgets that feel engineered rather than playful. The default example uses Accent Palette D and replaces ring metaphors with fill-based geometric widgets that stay legible in dark mode, adapt cleanly to iOS and Android, and remain usable at 200% text scale and reduced-motion settings.

# Design Tokens

## JSON Token Block

```json
{
  "meta": {
    "name": "Ascension Dark Fitness UI",
    "platforms": ["iOS", "Android", "Web"],
    "defaultAccentPalette": "D",
    "baselineGrid": 8
  },
  "color": {
    "foundation": {
      "background": "#05070A",
      "surface1": "#0D1117",
      "surface2": "#131A22",
      "surfaceElevated": "#192330",
      "borderDivider": "#243042",
      "textPrimary": "#F5F7FA",
      "textSecondary": "#B6C2CF",
      "textTertiary": "#8A96A3",
      "textDisabled": "#5E6875",
      "iconDefault": "#EAF0F6",
      "iconMuted": "#7D8895",
      "overlayScrim": "rgba(3,6,10,0.72)"
    },
    "accentPalettes": {
      "A": { "accent1": "#3A86FF", "accent2": "#FF7A18", "accent3": "#7CFF6B" },
      "B": { "accent1": "#00D1FF", "accent2": "#7A5CFF", "accent3": "#FF6B6B" },
      "C": { "accent1": "#FFA62B", "accent2": "#2EC4B6", "accent3": "#E71D36" },
      "D": { "accent1": "#00F5D4", "accent2": "#4361EE", "accent3": "#F72585" },
      "E": { "accent1": "#2ECC71", "accent2": "#4CC9F0", "accent3": "#FF8C42" }
    },
    "status": {
      "success": "#2ECC71",
      "warning": "#FFB020",
      "error": "#FF6B6B",
      "info": "#4CC9F0"
    },
    "charts": {
      "distance": "#00F5D4",
      "pace": "#4361EE",
      "elevation": "#FF8C42",
      "heartRate": "#F72585",
      "zoneFillColorBlindSafe": "#FFD166"
    }
  },
  "typography": {
    "fontFamily": {
      "ios": "SF Pro",
      "android": "Roboto",
      "premiumAlt1": "\"Sohne\", \"SF Pro\", \"Roboto\", sans-serif",
      "premiumAlt2": "\"TT Norms Pro\", \"SF Pro\", \"Roboto\", sans-serif",
      "numeric": "\"SF Mono\", \"Roboto Mono\", monospace"
    },
    "styles": {
      "display": { "size": 48, "lineHeight": 56, "weight": 700, "tracking": -0.02 },
      "h1": { "size": 32, "lineHeight": 38, "weight": 700, "tracking": -0.01 },
      "h2": { "size": 28, "lineHeight": 34, "weight": 600, "tracking": -0.01 },
      "h3": { "size": 22, "lineHeight": 28, "weight": 600, "tracking": -0.005 },
      "body": { "size": 16, "lineHeight": 24, "weight": 400, "tracking": 0.0 },
      "caption": { "size": 13, "lineHeight": 18, "weight": 500, "tracking": 0.01 },
      "button": { "size": 17, "lineHeight": 20, "weight": 600, "tracking": 0.01 },
      "micro": { "size": 11, "lineHeight": 14, "weight": 600, "tracking": 0.08 }
    }
  },
  "spacing": {
    "s4": 4,
    "s8": 8,
    "s12": 12,
    "s16": 16,
    "s20": 20,
    "s24": 24,
    "s32": 32,
    "s40": 40
  },
  "radius": {
    "xs": 8,
    "sm": 12,
    "md": 16,
    "lg": 20,
    "xl": 28,
    "pill": 999
  },
  "stroke": {
    "thin": 1,
    "regular": 2,
    "strong": 3
  },
  "layout": {
    "compactMax": 599,
    "mediumMax": 839,
    "expandedMax": 1199,
    "phoneColumns": 4,
    "tabletColumns": 8,
    "desktopColumns": 12,
    "phoneGutter": 16,
    "tabletGutter": 24,
    "compactPadding": 16,
    "mediumPadding": 24,
    "expandedPadding": 32
  },
  "motion": {
    "durationFast": 120,
    "durationDefault": 220,
    "durationSlow": 360,
    "durationProgress": 420,
    "easingStandard": [0.2, 0.0, 0.0, 1.0],
    "easingEntrance": [0.05, 0.7, 0.1, 1.0],
    "easingExit": [0.3, 0.0, 1.0, 1.0],
    "easingEmphasized": [0.2, 0.8, 0.2, 1.0]
  }
}
```

## CSS Variables Block

```css
:root {
  --bg: #05070a;
  --surface-1: #0d1117;
  --surface-2: #131a22;
  --surface-elevated: #192330;
  --border-divider: #243042;
  --text-primary: #f5f7fa;
  --text-secondary: #b6c2cf;
  --text-tertiary: #8a96a3;
  --text-disabled: #5e6875;
  --icon-default: #eaf0f6;
  --icon-muted: #7d8895;
  --accent-1: #00f5d4;
  --accent-2: #4361ee;
  --accent-3: #f72585;
  --chart-distance: #00f5d4;
  --chart-pace: #4361ee;
  --chart-elevation: #ff8c42;
  --chart-hr: #f72585;
  --chart-safe-alt: #ffd166;
  --space-4: 4px;
  --space-8: 8px;
  --space-12: 12px;
  --space-16: 16px;
  --space-20: 20px;
  --space-24: 24px;
  --space-32: 32px;
  --space-40: 40px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;
  --duration-fast: 120ms;
  --duration-default: 220ms;
  --duration-slow: 360ms;
  --duration-progress: 420ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-entrance: cubic-bezier(0.05, 0.7, 0.1, 1);
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);
  --ease-emphasized: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

## SwiftUI Token Snippets

```swift
import SwiftUI

enum FitnessColor {
    static let background = Color(hex: 0x05070A)
    static let surface1 = Color(hex: 0x0D1117)
    static let surface2 = Color(hex: 0x131A22)
    static let elevated = Color(hex: 0x192330)
    static let border = Color(hex: 0x243042)
    static let textPrimary = Color(hex: 0xF5F7FA)
    static let textSecondary = Color(hex: 0xB6C2CF)
    static let textTertiary = Color(hex: 0x8A96A3)
    static let accent1 = Color(hex: 0x00F5D4)
    static let accent2 = Color(hex: 0x4361EE)
    static let accent3 = Color(hex: 0xF72585)
}

enum FitnessFont {
    static let h1 = Font.system(size: 32, weight: .bold, design: .default)
    static let h2 = Font.system(size: 28, weight: .semibold, design: .default)
    static let h3 = Font.system(size: 22, weight: .semibold, design: .default)
    static let body = Font.system(.body, design: .default)
    static let caption = Font.system(.caption, design: .default).weight(.medium)
    static let button = Font.system(size: 17, weight: .semibold, design: .default)
    static let micro = Font.system(size: 11, weight: .semibold, design: .default)
    static let numeric = Font.system(.title2, design: .monospaced).weight(.semibold)
}
```

## Jetpack Compose Token Snippets

```kotlin
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

val FitnessDarkColors = darkColorScheme(
    background = Color(0xFF05070A),
    surface = Color(0xFF0D1117),
    surfaceVariant = Color(0xFF131A22),
    primary = Color(0xFF00F5D4),
    secondary = Color(0xFF4361EE),
    tertiary = Color(0xFFF72585),
    outline = Color(0xFF243042),
    onBackground = Color(0xFFF5F7FA),
    onSurface = Color(0xFFF5F7FA),
    onSurfaceVariant = Color(0xFFB6C2CF)
)

val FitnessTypography = Typography(
    displayLarge = TextStyle(fontFamily = FontFamily.Default, fontSize = 48.sp, lineHeight = 56.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.02).em),
    headlineLarge = TextStyle(fontFamily = FontFamily.Default, fontSize = 32.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold),
    headlineMedium = TextStyle(fontFamily = FontFamily.Default, fontSize = 28.sp, lineHeight = 34.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontFamily = FontFamily.Default, fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontFamily = FontFamily.Default, fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.Normal),
    bodySmall = TextStyle(fontFamily = FontFamily.Default, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
    labelLarge = TextStyle(fontFamily = FontFamily.Default, fontSize = 17.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
    labelSmall = TextStyle(fontFamily = FontFamily.Default, fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.08.em)
)
```

# Tables

## Navigation Comparison Table

| Pattern | Best Use Cases | Max Destinations | Pros | Cons | Accessibility Considerations |
|---|---|---:|---|---|---|
| Bottom nav | Phone-first apps with 3-5 primary areas used multiple times per session | 5 | Fast thumb reach, persistent context, easy habit learning | Consumes bottom space, weak for deep IA | Keep labels always visible; do not rely on icon-only states; keep 48dp min targets |
| iOS tab bar | iPhone-first apps following Apple conventions for top-level areas | 5 | Familiar on iOS, predictable voiceover order, strong muscle memory | Less adaptive on iPad, limited density | Keep filled icon for active tab, outlined for inactive; preserve 44pt target and badge semantics |
| Navigation rail | Medium and expanded layouts, tablets, foldables, landscape sessions | 5-7 | Frees bottom space, stable with large content panes, good for multitasking | Too heavy on compact phones | Use text labels or expand-on-focus labels; place rail outside gesture-conflict zones |
| Navigation drawer | Large IA, admin or rarely used destinations, secondary settings areas | 7+ | Scales well, supports hierarchy and grouping | Hidden options, slower frequent switching | Support keyboard focus order, large row targets, clear selected-state contrast |

Default phone strategy: use bottom navigation / iOS tab bar with four destinations: Home, Train, Progress, Profile.

Adaptive strategy: keep bottom navigation on compact, switch to navigation rail on expanded, and expose a drawer only for secondary areas like settings, privacy, and coach/admin tools.

## Component Size Table

| Element | Core Size | Touch Target | Radius | Padding | Notes |
|---|---:|---:|---:|---:|---|
| Top app bar | 56dp Android / 52pt iOS visual | n/a | 0 | 16 horizontal | Large title collapses to compact title on scroll |
| Bottom nav item | 24 icon + 12 label | 48dp / 44pt | 16 container highlight | 8 vertical | Filled active icon, outlined inactive |
| Nav rail item | 24 icon + 12 label | 56dp | 16 | 12 | Use on medium+ widths |
| Primary button | 52 height | 52 | 16 | 16 horizontal | Full-width CTA on compact |
| Secondary button | 48 height | 48 | 16 | 16 horizontal | Outline or tonal |
| Icon button | 20 or 24 icon | 44pt / 48dp | 14 | 10 | Circular or rounded-square background |
| Metric card | min 112 height | n/a | 20 | 16 or 20 | Two-column on compact, three-column on medium |
| Workout card | min 136 height | n/a | 20 | 20 | Include media, metadata, CTA |
| Chart card | min 220 height | n/a | 24 | 16 | Legend and filters stay inside card |
| Text field | 52 height | 52 | 16 | 14 horizontal | Dark filled field with 1px border |
| Segmented control | 40 height | 44 | 14 | 4 outer, 12 inner | Keep max 4 options |
| Chip | 32 or 36 height | 36 | Pill | 12 horizontal | Filter, tag, or status |
| Snackbar | 56 height min | n/a | 16 | 16 | 1-line or 2-line copy |
| Modal sheet | variable | n/a | 28 top corners | 24 | Drag handle 36x4 |

## Animation Timing Table

| Interaction | Duration | Easing | Behavior | Reduced Motion Fallback |
|---|---:|---|---|---|
| Button press | 90ms in, 120ms out | `ease-standard` | Opacity to 0.92 and scale to 0.98 | Opacity only |
| Expand / collapse | 220ms | `ease-standard` | Height + fade + slight y-shift 8px | Cross-fade content, no y-shift |
| Modal transition | 320ms | `ease-entrance` in / `ease-exit` out | Sheet translates from bottom 24px and fades | Fade only |
| Progress fill | 420ms | `ease-emphasized` | Fill rises, overshoots by 3%, settles in 80ms | Step-free linear fade between states |
| Chart tooltip | 120ms | `ease-standard` | Fade + scale from 0.98 to 1.0 | Fade only |

# Component Catalog

- App bars: 52-56pt high, `surface1` background, one leading action max, two trailing actions max, subtle divider after scroll.
- Bottom nav / tab bar: four destinations by default; filled active icon and outlined inactive icon.
- Nav rail: use on medium and expanded layouts only.
- Buttons: primary 52 high accent fill, secondary 48 high tonal, tertiary 44 high ghost, destructive red tonal, icon button 44/48 min target, large CTA 56 high.
- Cards: metric card 112-128 high, workout card 136-168 high, chart card 220-280 high.
- Lists: set list row 56-64 high, run split row 52 high.
- Inputs: dark filled text field with label, 40 high segmented control, 32/36 high chips.
- Feedback: snackbar, alert, modal sheet, and top-inline banner.
- Loaders: dark skeleton shimmer and accent spinner; swap spinner to opacity pulse under reduced motion.
- States for every component: default, pressed, focused, disabled, loading, error.

# Screen Blueprints

## 1. Home / Dashboard

- Header: safe-area top inset + 16, greeting, date, profile action, weekly streak chip.
- Content: daily summary hero, quick-start workout card, goal widgets row, last activity, weekly target strip.
- Footer: persistent bottom nav.
- Goal widgets: hexagon tank for activity minutes, capsule ladder for workouts, spiral for consistency, droplet for hydration or nutrition adherence.

## 2. Strength Training Session Full-Screen

- Header: exercise name, elapsed timer, state chips.
- Content: current set card, target reps and load, previous performance, rest timer, next exercise strip, shortcuts.
- Footer: sticky dual-CTA tray with `Rest` secondary and `Complete Set` primary.

## 3. Run Details with Split Charts

- Header: route title, date, total distance, time, pace.
- Content: pace line + elevation overlay card, split bars, zones summary, map snapshot.
- Interactions: hold for tooltip, tap legend to isolate series, optional zoom on larger layouts only.

## 4. Goals Screen (Apple-Rings Alternative)

- Header: page title, date scope segmented control, summary percentage.
- Content: 2x2 widget grid on compact with history/detail cards underneath.
- Widgets: hexagon tank-fill, capsule ladder segments, rounded-square spiral stroke, droplet fill.
- Motion: 420ms rise or draw with 3% overshoot and settle; reduced motion snaps and fades numeric delta only.

## 5. Settings

- Header: compact app bar with title and search.
- Content: grouped cards for Appearance, Units, Accessibility, Privacy, Connected Services.
- Footer: version and legal links.

# Motion / Animation Guidelines

- Motion tokens: fast 120ms, default 220ms, slow 360ms, progress 420ms.
- Easing tokens: standard `(0.2,0,0,1)`, entrance `(0.05,0.7,0.1,1)`, exit `(0.3,0,1,1)`, emphasized `(0.2,0.8,0.2,1)`.
- Avoid motion on high-frequency updates like every-second timers unless it conveys meaning.
- Use fades or low-distance translation rather than large scale effects.
- Progress fill behavior: fill rises or draws toward the new value, overshoots by 3%, then settles over the last 80ms; reduced motion uses direct value swap plus numeric fade.

# Accessibility

- Contrast: 4.5:1 for body text, 3:1 for large text, icons, borders, and chart marks where required.
- Targets: 44x44pt minimum on iOS, 48x48dp default on Android, 24x24 CSS px absolute minimum only for non-primary web controls.
- Color-blind support: pair each metric color with a fixed icon or stroke style; use solid pace, dashed elevation, striped zone fills, and icon markers.
- Larger text: let hero numbers wrap to two lines, keep labels outside shape-only widgets, and stack dense rows vertically at 200% scale.
- Screen reader examples:
  - "Active minutes goal, 42 of 60 minutes, 70 percent complete."
  - "Split 3, pace 5 minutes 12 seconds per kilometer, elevation plus 14 meters."
  - "Complete set 3 of 5, double tap to log 8 reps at 80 kilograms."

# Data Visualization Rules

- Use split bar chart, pace line chart, elevation overlay, and zone distribution as the default chart family.
- Keep units visible in axes and tooltips.
- Map accent colors consistently: distance/activity `accent1`, pace `accent2`, elevation orange/amber, intensity `accent3`.
- Match legend order to render order exactly.

# Export / Asset Specs

- iOS: prefer vector PDF icons; export raster assets at @2x and @3x; use PNG for transparency and JPEG for full-bleed photography only.
- Android: prefer VectorDrawable icons; export mdpi, hdpi, xhdpi, xxhdpi, and xxxhdpi rasters only when vectors are not viable.
- Naming:
  - Icons: `ic_<feature>_<style>_<size>`
  - Illustrations: `ill_<screen>_<subject>_<theme>`
  - Goal widgets: `goal_<shape>_<metric>_<palette>`
  - Screens: `screen_<route>_<platform>_<theme>_<size>`

# Code Snippets

## A. Dynamic-Fill Progress Shape

### CSS / SVG

```html
<div class="goal-card" style="--progress: 0.72; --fill: var(--accent-1);">
  <svg class="hex-tank" viewBox="0 0 160 180" aria-label="Activity goal 72 percent complete" role="img">
    <defs>
      <clipPath id="hex-clip">
        <path d="M80 8 141 44v92l-61 36-61-36V44z"/>
      </clipPath>
    </defs>
    <path class="shell" d="M80 8 141 44v92l-61 36-61-36V44z"/>
    <g clip-path="url(#hex-clip)">
      <rect class="fill" x="19" width="122" y="82" height="98"/>
    </g>
  </svg>
</div>
```

```css
.goal-card {
  background: var(--surface-1);
  border: 1px solid var(--border-divider);
  border-radius: var(--radius-lg);
  padding: var(--space-16);
}
.hex-tank .shell {
  fill: none;
  stroke: var(--border-divider);
  stroke-width: 4;
}
.hex-tank .fill {
  fill: var(--fill);
  transition: y var(--duration-progress) var(--ease-emphasized);
}
@media (prefers-reduced-motion: reduce) {
  .hex-tank .fill { transition: none; }
}
```

### SwiftUI

```swift
struct HexagonTankProgress: View {
    let progress: CGFloat
    var body: some View {
        GeometryReader { proxy in
            let clamped = max(0, min(progress, 1))
            ZStack(alignment: .bottom) {
                HexagonShape().stroke(FitnessColor.border, lineWidth: 4)
                HexagonShape()
                    .fill(FitnessColor.accent1)
                    .mask(alignment: .bottom) {
                        Rectangle().frame(height: proxy.size.height * clamped)
                    }
            }
            .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.42), value: clamped)
        }
    }
}
```

### Jetpack Compose

```kotlin
@Composable
fun HexagonTankProgress(progress: Float, modifier: Modifier = Modifier) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(420, easing = CubicBezierEasing(0.2f, 0.8f, 0.2f, 1f)),
        label = "hex-progress"
    )
    Canvas(modifier = modifier.size(112.dp, 126.dp)) {
        val path = Path().apply {
            moveTo(size.width * 0.5f, 0f)
            lineTo(size.width, size.height * 0.23f)
            lineTo(size.width, size.height * 0.77f)
            lineTo(size.width * 0.5f, size.height)
            lineTo(0f, size.height * 0.77f)
            lineTo(0f, size.height * 0.23f)
            close()
        }
        clipPath(path) {
            drawRect(Color(0xFF00F5D4), topLeft = Offset(0f, size.height * (1f - animatedProgress)), size = Size(size.width, size.height * animatedProgress))
        }
        drawPath(path, Color(0xFF243042), style = Stroke(width = 4.dp.toPx()))
    }
}
```

## B. Split-Run Chart

### CSS / SVG

```html
<svg viewBox="0 0 360 220" role="img" aria-label="Five splits with pace line and elevation overlay">
  <g transform="translate(20 16)">
    <rect x="0" y="36" width="44" height="132" rx="12" fill="rgba(67,97,238,0.22)"/>
    <rect x="56" y="48" width="44" height="120" rx="12" fill="rgba(67,97,238,0.28)"/>
    <rect x="112" y="28" width="44" height="140" rx="12" fill="rgba(67,97,238,0.34)"/>
    <path d="M0 120 C24 92, 40 88, 56 98 S96 112, 112 76 S152 52, 168 88" fill="none" stroke="#4361EE" stroke-width="4" stroke-linecap="round"/>
    <path d="M0 168 C32 160, 56 152, 84 144 S136 128, 168 148 L168 168 Z" fill="rgba(255,140,66,0.18)" stroke="#FF8C42" stroke-dasharray="6 6" stroke-width="2"/>
  </g>
</svg>
```

### SwiftUI

```swift
import Charts

struct SplitRunChart: View {
    let splits: [SplitPoint]
    var body: some View {
        Chart(splits) { item in
            BarMark(x: .value("Split", item.split), y: .value("Pace", item.paceSeconds))
                .foregroundStyle(FitnessColor.accent2.opacity(0.28))
            AreaMark(x: .value("Split", item.split), y: .value("Elevation", item.elevationGain))
                .foregroundStyle(Color.orange.opacity(0.18))
            LineMark(x: .value("Split", item.split), y: .value("Pace", item.paceSeconds))
                .foregroundStyle(FitnessColor.accent2)
        }
    }
}
```

### Jetpack Compose

```kotlin
@Composable
fun SplitRunChart(data: List<SplitMetric>, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.fillMaxWidth().height(240.dp)) {
        val barWidth = size.width / (data.size * 1.25f)
        data.forEachIndexed { i, item ->
            val x = i * (barWidth * 1.25f)
            val barHeight = size.height * (item.pace / data.maxOf { it.pace })
            drawRoundRect(Color(0x474361EE), topLeft = Offset(x, size.height - barHeight), size = Size(barWidth, barHeight), cornerRadius = CornerRadius(12.dp.toPx(), 12.dp.toPx()))
        }
    }
}
```

## C. Strength Session Full-Screen Layout

### CSS / SVG

```html
<main class="session-screen">
  <header class="session-header">
    <div><p class="micro">CURRENT EXERCISE</p><h1>Barbell Back Squat</h1></div>
    <div class="timer">18:42</div>
  </header>
  <section class="hero-card">Set 3 of 5 · 8 reps · 80 kg · 90 sec rest</section>
  <footer class="sticky-actions">
    <button class="secondary">Rest</button>
    <button class="primary">Complete Set</button>
  </footer>
</main>
```

### SwiftUI

```swift
struct StrengthSessionView: View {
    var body: some View {
        ZStack(alignment: .bottom) {
            FitnessColor.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 16) {
                    HStack {
                        Text("Barbell Back Squat").font(FitnessFont.h1)
                        Spacer()
                        Text("18:42").font(FitnessFont.numeric)
                    }
                }
                .padding(16)
                .padding(.bottom, 112)
            }
        }
    }
}
```

### Jetpack Compose

```kotlin
@Composable
fun StrengthSessionScreen() {
    Scaffold(
        containerColor = Color(0xFF05070A),
        bottomBar = {
            Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = {}, modifier = Modifier.weight(0.9f).height(56.dp)) { Text("Rest") }
                Button(onClick = {}, modifier = Modifier.weight(1.1f).height(56.dp)) { Text("Complete Set") }
            }
        }
    ) { innerPadding ->
        Column(Modifier.fillMaxSize().padding(innerPadding).padding(16.dp)) {
            Text("Barbell Back Squat", style = FitnessTypography.headlineLarge, color = Color(0xFFF5F7FA))
        }
    }
}
```

# Final Checklist of Design Rules

- Use one accent palette at a time; default to Palette D.
- Keep all loading, empty, sheet, and error states on dark surfaces.
- Do not use concentric rings or near-ring lookalikes for goals.
- Use monospaced digits for timers, pace, elapsed time, and load readouts.
- Maintain 8pt spacing rhythm and respect safe areas on top and bottom.
- Keep primary controls out of home-indicator and gesture-back conflict zones.
- Pair chart and status colors with shape, label, or pattern cues.
- Support 200% text scale by stacking dense layouts vertically before truncating.
- Prefer bottom nav on compact and navigation rail on expanded layouts.
- Use filled active icons and outlined inactive icons in top-level navigation.
- Use subtle, purposeful motion; disable scale/spin-heavy effects under reduced motion.
- Export icons as vectors first, illustrations with dark-ready masks and rounded corners.
