# Motionsites Template: Duolingo Styleguide → SpeakIQ Adaptation
# Source: https://motionsites.ai (Duolingo Styleguide, free Copy)
# Design: Nunito font, language selector bubbles, XP progress, gamified feel

## Key design elements to adapt:
- Brand: "SpeakIQ" (not "Duolingo")
- Font: Nunito (matches current speakiq font — already loaded)
- Language picker: 6 bubble flags inline above CTA (reuse existing LanguagePicker)
- Headline: "Start speaking in minutes," / "not months."
- Sub: "AI conversation partner — 50+ languages, instant feedback"
- CTA: "Start speaking {lang}" + ghost "See how it works"
- Colors: #1a1a2e bg, indigo/violet gradient accent (matches current)
- XP bar below headline (mock, fills on hover): "2,847 learners speaking today"
- Animated: bouncy Framer Motion stagger on headline chars

## Already built — preserve these:
- LanguagePicker component (reuse in hero)
- HeroDemo on right panel
- STAGGER_CONTAINER, FADE_UP motion variants
- ShimmerButton
