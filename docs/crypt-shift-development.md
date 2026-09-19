# Crypt Shift development record

## Milestone 1: rules before artwork

The first playable uses a fixed room and geometric placeholders. The game rules
live in `cryptShiftRules.js` and do not depend on Phaser or the DOM. Phaser only
collects input and renders the resulting state.

This makes movement, enemy turns, level reachability, rune collection, victory,
and defeat testable without launching a browser.

## First article

**Building the Rules Before the Graphics**

Use the text map, the pure `takeTurn` function, and the automated tests to show
how a graphical canvas game can keep its important logic deterministic.

## Next milestone

1. Add a second enemy behaviour.
2. Add deterministic seeded generation.
3. Validate thousands of generated rooms automatically.
4. Add Daily and Random modes.
5. Replace geometric placeholders with one coherent crypt tileset.
6. Add animation, sound, particles, leaderboard and sharing.
