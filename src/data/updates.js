export const updates = [
    {
    date: '2026-07-10',
    title: 'Peg Solitaire',
    body: [
      'Added new initial game of Pegs Solitaire',
    ],
  },
  {
    date: '2026-05-20',
    title: 'All Games',
    body: [
      'Upgraded to Astro 6',
      'Added Share feature to Sudoku',
      'Added How to Play modal to Sudoku',
    ],
  },
  {
    date: '2026-05-19',
    title: 'Sudoku',
    body: [
      'Added Sudoku to game page, saved scores are already implemented, still correcting mobile formats',
    ],
  },
  {
    date: '2026-05-12',
    title: 'All Existing Games',
    body: ['Added saved high scores to all exiting games'],
  },
  {
    date: '2026-04-01',
    title: 'New Game: Shift',
    body: [
      'Shift some numbers around to make more numbers, how high can you get?',
      'Updated Copyright to link to eddiesaunders.com',
      'Updated Redacted to correct some formatting issues on mobile devices',
      'Removed screen size limitations, and started to fix Match game',
      'Implmeneted V1 of Mobile input for testing',
    ],
  },
  {
    date: '2026-03-31',
    title: 'New Game: Sequence',
    body: [
      'A take on the Simon Says game, Sequence is a simple pattern memory game. Watch the pattern, and repeat it back. The pattern gets longer each time, how long can you last?',
    ],
  },
  {
    date: '2026-03-04',
    title: 'Match: Corrected issue with flipped card colour',
    body: [
      'Match flipped cards were too dark and hard to read, this has been resolved',
      'Resolved issue with grid not always rendering',
    ],
  },
  {
    date: '2026-03-01',
    title: 'Resolved Redacted Paste Score Format',
    body: ['Redacted score to copy and paster was out of whack, fixed than :D'],
  },
  {
    date: '2026-02-28',
    title: 'Match Game Appearance',
    body: [
      "Updated Match to bring it's style in line with redacted",
      'Resolved issue with flipping tiles being flipped back over once matched',
      'Formatted 4x4 tiles in Match game',
      'Bought react game appearance in line with other games',
      'Enlarged play area for react game',
      'Added Top 5 scores on right of game area',
      'Added in share feature to Redacted, a simple copy paste deal',
      'Added score share feature to Match',
      'Added score share feature to React',
    ],
  },
  {
    date: '2026-02-27',
    title: 'Front page formatting, and Redcated word list',
    body: [
      'Front page CSS has been updated for improved tablet views',
      'Redacted word list has been cleaned up and excess unrequired words removed',
      'made some changes to Redacted to make it a little more mobile friendly, but in all fairness mobile is not the best format',
      'Added in score save to Redacted, added in a restriction of at least 800 pixels for Move',
    ],
  },
  {
    date: '2026-02-26',
    title: 'Sound effects added across games + Timing Bar fixes',
    body: [
      'Redacted: keypress + win SFX.',
      'Match: click + match + win SFX.',
      'Timing Bar: start no longer counts as a miss; restart restores space-key control.',
      'Footer added to player pages; ad placeholders removed.',
    ],
  },
  {
    date: '2026-02-25',
    title: 'Email set up: eddie@eddiesgames.xyz',
    body: [
      'Microsoft 365 mailbox configured and tested (send/receive).',
      'DNS records added in Cloudflare (MX, SPF, autodiscover).',
    ],
  },
];
