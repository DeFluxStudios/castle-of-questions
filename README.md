# Castle of Questions

A first-person trivia maze inspired by *MindMaze*, the castle quiz game that shipped with Microsoft Encarta in the 1990s. You wander a medieval castle one room at a time. Every closed door asks a multiple-choice question: answer right and it opens, answer wrong and it's barred for good. Find the staircase on each floor and climb all the way to the throne room.

This is an original fan-made homage. All questions, characters, room names and artwork are new, and the art is generated procedurally with Python.

## Play

Open `docs/index.html` in a browser, or turn on **GitHub Pages** for this repo (Settings → Pages → Deploy from branch → `main` / `/docs`) to play it at `https://<user>.github.io/castle-of-questions/`.

Controls: tap doors, people and paintings, or use the arrow keys (← → turn, ↑ go forward, ↓ turn around, Enter to climb stairs).

## Features

- **Three castle sizes.** Tower (3 floors of 6×6), Keep (4 floors of 8×8) and Citadel (5 floors of 10×10). Each floor is a freshly generated maze with loops.
- **Four difficulty levels.** Page, Squire, Knight and Sovereign. Higher levels draw harder questions, give less time on the clock and score more points.
- **288 questions** in nine subjects. You can turn any subject on or off.
- **Optional timer.** Running out of time counts as a wrong answer.
- **Castle residents, each with something to do.**
  - **Pip the Jester** plays a shell game: pick the cup with the pea.
  - **Sir Aldous, Brother Anselm, Mistress Hearth and Lady Isolde** have each lost something on their floor. Find it and bring it back for a key and points.
  - **Magister Orrin** marks the staircase on your map.
  - **Professor Hoot** asks a bonus question with no penalty for a miss.
  - **Wren the Bard** bets you points on your next door.
  - **Old Varro** offers a potion of unpredictable effect.
  - **Fennick the Peddler** sells keys and hints for points.
  - The parrot, the cat and the wandering ghost hand out gifts.
- **Sphinxes.** Every floor has a sphinx with a riddle (30 of them): answer for a key, a hint and points, miss and she takes a hint. On the top floor the **Great Sphinx** guards the stairs to the throne. You can retry, but each miss costs a toll.
- **Quibble the Trickster** (floor 2 and up) offers a shortcut: three of the hardest questions in the castle, no hints. Win them all for a big bonus, a key and a free ride up a floor. Miss one and you're sent back to a brand-new floor 1, keeping your score, keys and hints.
- **Treasure chests** hold points, hints or keys. Beware: some are mimics that demand an answer.
- **A wishing well** on each floor. Toss a coin and hope.
- **A crooked painting** on each floor hides a clue to where the stairs are.
- **Hints** remove two wrong answers. **Keys** open barred doors. If you get trapped, a shadowy locksmith will sell you a key.
- **Paintings** on the walls. Tap one for a closer look.
- **Saving.** Progress auto-saves, and a high-score table is kept in your browser.

## Project layout

```
art/generate_art.py   Procedural artwork (Pillow + NumPy)
docs/index.html       The game page
docs/game.js          Game engine
docs/questions.js     Question bank and sphinx riddles: add your own rows here
docs/style.css        Styles
docs/assets/          Generated images
```

## Regenerating the art

```bash
pip install pillow numpy
python art/generate_art.py                 # writes docs/assets/
python art/generate_art.py --seed 42       # a different set of paintings and textures
```

The script draws everything in code: perspective-warped brick, plank, tile, damask and bookshelf textures for five room themes, torchlight glows, fifteen character portraits (including the sphinx, merchant and trickster), chests, a wishing well, lost quest items, 24 framed paintings (landscapes, seascapes, still lifes, geometric compositions), the title scene, the staircase and the throne room.

## Adding questions

Each row in `docs/questions.js` is:

```js
["GE", 2, "What is the capital of Canada?", "Ottawa", "Toronto", "Montreal", "Vancouver"]
//  subject, difficulty 1–4, question, correct answer, three wrong answers
```

Subject codes: `LS` Life Science, `PS` Physical Science, `GE` Geography, `HI` History, `SS` Social Science, `RP` Religion & Philosophy, `AL` Art, Language & Literature, `PA` Performing Arts, `SH` Sports, Hobbies & Pets.

Sphinx riddles live in `window.RIDDLES` at the bottom of the same file: `[riddle, correct answer, wrong, wrong, wrong]`.
