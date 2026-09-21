# PDF fonts

The PDF templates prefer **Cormorant Garamond** (display serif) + **Plus
Jakarta Sans** (body sans), the Ladakh Vacation brand pairing used on the
website and the Ads landers. If the TTF files aren't present here at boot, the
templates fall back to the built-in PDF-14 fonts (Times-Roman + Helvetica):
no crash, no missing glyphs.

To upgrade, drop these four files in this folder:

```
CormorantGaramond-Regular.ttf
CormorantGaramond-Bold.ttf
PlusJakartaSans-Regular.ttf
PlusJakartaSans-Bold.ttf
```

Get them from:

- Cormorant Garamond: https://fonts.google.com/specimen/Cormorant+Garamond → Download family → `static/`
- Plus Jakarta Sans: https://fonts.google.com/specimen/Plus+Jakarta+Sans → Download family → `static/`

Rename the specific weights above if needed and drop them here. Restart the
backend and the next PDF renders in the brand fonts.

Do NOT commit variable-font files here: they render fine but bloat the repo by
~600 KB and PDF viewers treat them the same as the static instances.
