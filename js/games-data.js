/*
  games-data.js — the list of games shown on the website.

  HOW TO ADD A GAME (no other file needs to change):
    1. Copy one whole block below, from { to }, and paste it after the last one.
       Make sure there is a comma between blocks.
    2. Change the text. "url" must be the real, working address of the game.
    3. Put the game's picture in assets/images/games/ and set "image" to its path.
       Best size: 640 x 400 pixels (or any picture with a 16:10 shape).
       JPG, PNG, WebP and SVG all work.

  Fields:
    title        The game's name.
    category     A short label shown above the title, e.g. "Arcade".
    description  One or two sentences.
    tags         Short facts shown as small badges (optional, can be []).
    image        Path to the picture, starting with "/" (for example "/assets/images/games/name.webp").
    imageAlt     A short description of the picture for screen readers.
    page         The game's own page on this site, e.g. "/games/grid-snake/" (optional; adds a
                 "Details" button next to Play Now).
    url          The playable game's web address (use https://atherbyte.online/<game-folder>/).

  A block with no "title" or no "description" is skipped (it can never break the rest of
  the page), so a half-finished entry is safe to leave in the list.
*/
window.ATHERBYTE_GAMES = [
  {
    title: "Grid Snake",
    category: "Arcade",
    description:
      "A browser snake game. Steer, eat to grow, and avoid the walls and your own tail. Play with solid walls or wrap-around edges.",
    tags: ["Classic", "Time Attack", "Survival", "Apple Run"],
    image: "/assets/images/games/grid-snake.webp",
    imageAlt: "Grid Snake's start screen showing four game modes: Classic, Time Attack, Survival and Apple Run.",
    page: "/games/grid-snake/",
    url: "https://atherbyte.online/grid-snake/"
  },
  {
    title: "Stop the Timer",
    category: "Precision",
    description:
      "A timing game. Start the timer, then stop it as close to the target time as you can. Pick a 1, 3 or 5 second target and build your streak.",
    tags: ["1, 3 or 5 second targets", "Best score", "Streaks"],
    image: "/assets/images/games/stop-the-timer.webp",
    imageAlt: "Stop the Timer's start screen: a cartoon rabbit beside buttons for 1, 3 and 5 second targets and a Start button.",
    page: "/games/stop-the-timer/",
    url: "https://atherbyte.online/Feel-the-time/"
  }
];
