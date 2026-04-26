# Skill: Styling

Material 3, theme-driven. **Never hardcode colors, sizes, or font weights in widgets.**

## Theme Setup

`lib/core/theme/app_theme.dart`:

```dart
class AppTheme {
  static ThemeData light() => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF6750A4),
      brightness: Brightness.light,
    ),
    textTheme: _textTheme,
    visualDensity: VisualDensity.adaptivePlatformDensity,
  );

  static ThemeData dark() => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF6750A4),
      brightness: Brightness.dark,
    ),
    textTheme: _textTheme,
  );
}
```

## Reading Theme in Widgets

```dart
final theme = Theme.of(context);
final colors = theme.colorScheme;
final text = theme.textTheme;

Container(
  color: colors.surfaceContainerHighest,
  child: Text('Hello', style: text.bodyLarge),
)
```

## Color Tokens — Use These, Not Custom Hex

| Use case | Token |
|---|---|
| Page background | `colorScheme.surface` |
| Card / raised surface | `colorScheme.surfaceContainer` |
| Primary action | `colorScheme.primary` |
| On primary text | `colorScheme.onPrimary` |
| Body text | `colorScheme.onSurface` |
| Subtle text | `colorScheme.onSurfaceVariant` |
| Error | `colorScheme.error` |
| Divider | `colorScheme.outlineVariant` |

## Typography Tokens

| Use | Token |
|---|---|
| Page title | `textTheme.headlineMedium` |
| Section header | `textTheme.titleLarge` |
| List item title | `textTheme.bodyLarge` |
| List item subtitle | `textTheme.bodyMedium` |
| Caption / metadata | `textTheme.bodySmall` |
| Button label | `textTheme.labelLarge` |

## Spacing

Use a consistent scale. Add to `lib/core/theme/spacing.dart`:

```dart
abstract final class Spacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
}
```

Then: `Padding(padding: EdgeInsets.all(Spacing.md), ...)`.

## Don'ts

- ❌ `color: Colors.blue` — use `colorScheme.primary`.
- ❌ `fontSize: 16` — use `textTheme.bodyLarge`.
- ❌ `padding: EdgeInsets.all(16)` — use `Spacing.md`.
- ❌ Inline `TextStyle()` — extend the theme instead.
