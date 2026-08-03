Below is a research-backed design memo for Steppe to Screen focused on child-authored, offline-first, workshop-friendly game formats for ages 5–12. I’m separating direct evidence from inference where it matters, and I’ve prioritized mechanics that let children *make* meaningful content, not just reskin it. [coderkids](https://www.coderkids.com/blog/scratchjr-projects-for-kids)

## 1) Best mechanics

| Mechanic | Best learning objective | Ages | Typical session | Solo / live | Child-authorship depth | Implementation effort | Device needs | Offline feasibility | Main risk |
|---|---|---:|---|---|---|---|---|---|---|
| Endless runner with decision forks | Vocabulary, listening, quick recall, pronunciation checkpoints | 6–12 | 2–4 min | Solo + projector | Medium–high if kids author forks, hazards, rewards, voice lines | Medium | Touchscreen, audio | High | Becomes reflex-only if language prompts are too thin |
| Story map / branching narrative | Sentence construction, speaking, cultural knowledge | 7–12 | 5–10 min | Solo + live | High | Medium | Touchscreen, audio | High | Branch explosion, heavy moderation burden |
| Draw-and-record prompt game | Vocabulary, speaking, description, storytelling | 5–12 | 3–8 min | Solo + live | High | Low–medium | Touchscreen, mic | High | Requires good review tools for voice and images |
| Scavenger hunt / photo quest | Listening, cultural observation, vocab in context | 5–12 | 5–15 min homework | Solo + family | Medium | Medium | Camera, audio, GPS optional | High if no GPS dependency | Safety, privacy, off-platform supervision |
| Rhythm / echo game | Pronunciation, phonological awareness, listening | 5–10 | 1–3 min | Solo + live | Medium | Medium | Mic, audio playback | Medium | Speech-recognition brittleness for young voices |
| Puppet/dialogue roleplay | Speaking, turn-taking, cultural scripts | 5–9 | 3–8 min | Live | High | Low | Mic, camera optional | High | Hard to scale unless prompts are well templated |
| Sentence-building tiles | Sentence construction, grammar patterns | 7–12 | 3–6 min | Solo + live | Medium | Low | Touchscreen | High | Can collapse into worksheet behavior |
| Match-to-context puzzle | Vocabulary, listening, cultural knowledge | 5–10 | 2–5 min | Solo | Low–medium | Low | Touchscreen, audio | High | Too close to flash cards if not embedded in play |
| Collaborative projector game | Listening, speaking, teamwork, cultural recall | 5–12 | 5–15 min | Live | Medium | Medium | Projector + phones | Medium | Dominant kids can take over |
| Route-planning / map quest | Sequencing, cultural geography, listening | 7–12 | 5–10 min | Solo + live | High | Medium | Touchscreen | High | Needs strong UI clarity |
| Collect-and-combine crafting game | Vocabulary, categorization, sentence-making | 5–12 | 5–10 min | Solo + live | High | Medium | Touchscreen, optional mic | High | Content moderation if freeform assets are allowed |
| Audio mystery / listening detective | Listening discrimination, vocab, pronunciation | 5–12 | 2–5 min | Solo + live | Medium | Low–medium | Audio, mic optional | High | Audio quality and accent variance |

### Evidence-based take
The strongest language-learning value comes from mechanics that force children to *use language to do something* rather than to answer isolated prompts; game-based language learning is especially strong for vocabulary, listening, and pronunciation, while speaking and open-ended conversation improve when the game includes real voice input and feedback.  ScratchJr and Seesaw show that young children can successfully create stories, drawings, and voice recordings without coding, which is exactly the kind of authorship Steppe to Screen should borrow. [coderkids](https://www.coderkids.com/blog/scratchjr-projects-for-kids)

## 2) Child authorship ladder

The useful ladder is not “customize vs. not customize.” It is:

1. **Surface skinning.** Change colors, avatar, background, sticker pack.
2. **Scene assembly.** Place objects, choose characters, choose a setting, choose audio.
3. **Prompt selection.** Choose from teacher-approved questions, sound cues, or vocabulary banks.
4. **Prompt editing.** Rewrite a question, change a sentence stem, change difficulty.
5. **Rule tuning.** Decide time limits, number of lives, what happens on success/failure.
6. **Level making.** Place forks, obstacles, shortcuts, clues, and rewards.
7. **Story building.** Create branching scenes, quests, dialogue, endings.
8. **System design.** Invent the game’s core loop, win condition, or social rule set.

### What counts as genuine authorship
The best evidence of real authorship is when children can change the *questions, rules, level structure, or story logic*, not just the artwork. ScratchJr’s value is not the paint tools alone; it is that children can create interactive stories and record voices, which changes the behavior of the project, not just the look.  Seesaw is useful because it lets students combine drawing, uploading, and voice recording in one artifact, which supports authored explanation rather than decorative output. [coderkids](https://www.coderkids.com/blog/scratchjr-projects-for-kids)

## 3) Best mechanic ranking

Ranked by learning value, replayability, child agency, workshop fit, and build cost:

1. **Draw-and-record prompt game.** Best balance of age range, authorship, low build cost, and strong language output. [k12technology.weebly](https://k12technology.weebly.com/seesaw.html)
2. **Branching narrative / story map.** Excellent for sentence construction, culture, and home homework reuse. [coderkids](https://www.coderkids.com/blog/scratchjr-projects-for-kids)
3. **Endless runner with decision forks.** Strong replayability and workshop energy; easy to understand. [egarp](https://egarp.lt/index.php/EGJLLE/article/download/311/309)
4. **Collaborative projector game.** Great for weekly live sessions and native-speaker review. [classdojo](https://www.classdojo.com/activity-corner/build-challenge/)
5. **Scavenger hunt / photo quest.** Strong bridge between class, home, and culture if moderation is good. [culpeer-digital](https://culpeer-digital.eu/interactive-cultural-online-games.php)

## 4) Endless runner concept

### Core idea
A child runs through a Kazakh world where each fork, bridge, rope, gate, or shortcut is gated by a language decision. The decision can be a spoken prompt, listening prompt, picture prompt, or sentence-completion prompt; correct choices send the runner onto the safe route, while incorrect choices give a playful detour, lost time, or a “help from a friend” retry. Endless runners work well because they create a rapid “hear, decide, act” loop, and you can vary difficulty by changing prompt type and reaction window. [egarp](https://egarp.lt/index.php/EGJLLE/article/download/311/309)

### 3-minute loop
- **0:00–0:20: Warm-up.** Child picks a character, outfit, pet, and a cultural route theme such as steppe, village, market, festival, or winter road.
- **0:20–1:00: First run.** The runner auto-moves; before the first fork, the game plays an audio cue: “Which word means horse?” or “Tap the picture for *...*”.
- **1:00–1:40: Combo build.** Correct answers unlock coins, cultural objects, and a multiplier; the child hears short native audio and repeats one phrase for bonus.
- **1:40–2:20: Twist.** A shortcut demands sentence completion, e.g. “I see a ___.” The child chooses a noun or records the phrase.
- **2:20–3:00: Finish and replay.** The run ends at a milestone gate, not failure. The game shows collected items, learned words, and one “make it your own” prompt to create the next route.

### Progression system
Use three parallel progression tracks:
- **Language track:** easier to harder prompts, from picture-to-word, to listening, to speaking, to sentence building.
- **World track:** new biomes, characters, objects, and cultural scenes.
- **Creator track:** unlocks to place forks, choose obstacles, upload art, and record route narration.

### Failure and retry
Avoid hard failure. Wrong answers should branch into:
- a short detour,
- a supportive hint,
- a “try again” replay,
- or a collaborative rescue mode in live class.  
For ages 5–7, keep failure gentle and fast; for 8–12, allow score, combo loss, and mastery replay. Accessibility guidance supports adjustable speed, one-button play, large elements, strong contrast, and visual cues for audio events. [internetmatters](https://www.internetmatters.org/hub/guidance/accessibility-video-games-designed-for-everyone/)

### Accessibility alternatives
- **Tap alternative** for swipe forks.
- **Voice alternative** for decision points.
- **Picture choice** for pre-literate players.
- **Facilitator mode** where the projector asks the class and the children vote on their phones.
- **Slow mode / high contrast / reduced motion / no rapid timing** options. [internetmatters](https://www.internetmatters.org/hub/guidance/accessibility-video-games-designed-for-everyone/)

## 5) No-code builder

### Smallest useful set
Expose only the following creation primitives:

- **Templates:** runner, story map, draw-and-record card, scavenger hunt, projector quiz, rhythm loop.
- **Content blocks:** image, audio, short text, sentence stem, choice set, fork, obstacle, reward, clue, ending.
- **Controls:** drag, duplicate, reorder, swap, link, preview, record, trim, approve, publish draft.
- **Constraints:** approved vocabulary lists, maximum branch depth, audio length limits, age band limits, asset type restrictions.
- **Moderation gates:** child draft, facilitator review, educator/native-speaker review, publish.

### Required features
- Import drawings exported from Canva or Figma as images.
- Draw in-app with simple brush, erase, color, sticker, stamp, and undo.
- Record and replay audio per card, character, or choice.
- Reuse homework as inputs for class pack creation.
- Convert one child submission into many templates, e.g. a drawing becomes a runner obstacle, a story card, and a listening prompt.  
This is strongly aligned with Seesaw and ScratchJr patterns: drawing, upload, voice recording, and story creation in a very small toolset. [k12technology.weebly](https://k12technology.weebly.com/seesaw.html)

### Moderation gates
Use a four-step gate:
1. Child creates draft.
2. Facilitator checks for safety and relevance.
3. Native speaker checks pronunciation, wording, and cultural accuracy.
4. System tags approved content as reusable building blocks.  
UNICEF-style child-rights-by-design and privacy-by-design principles argue for data minimization, informed consent, purpose limitation, and visible control over children’s personal data. [unicef](https://www.unicef.org/innocenti/media/1096/file/%20UNICEF-Global-Insight-DataGov-data-use-brief-2020.pdf)

## 6) Weekly roadmap

### Child loop
- In class, children play one shared live game.
- At home, they remix one thing: a drawing, voice line, route choice, or question.
- Next week, their contribution appears in the class pack.

### Facilitator loop
- Pick one weekly theme.
- Launch the live projector game.
- Collect homework artifacts.
- Approve a small subset for reuse.
- See which words, sounds, or cultural facts caused confusion.

### Educator/native-speaker loop
- Review child-created questions and audio.
- Add pronunciation approval and cultural context.
- Tag assets by level, region, and theme.
- Flag items for removal or repair.  
This is the loop that turns a classroom activity into a content engine; Seesaw-like voice/drawing artifacts and ClassDojo-style classroom workflows are good reference points, but Steppe to Screen should go further by making approved child content directly re-usable in new games. [k12technology.weebly](https://k12technology.weebly.com/seesaw.html)

## 7) Team contribution model

Asynchronous contributions should be small, reviewable, and visibly used:
- **Teachers** propose weekly packs and choose the target vocabulary.
- **Native speakers** approve pronunciation and sentence naturalness.
- **Cultural reviewers** add context, examples, and notes about usage.
- **Facilitators** mark what worked in class and what confused children.
- **Product team** turns approved assets into new templates and tracks reuse evidence.  

A good “evidence of impact” panel should show: “used in 12 child games,” “heard 48 times,” “approved for ages 7–9,” and “came from Aigerim’s homework drawing.” That closes the loop and motivates contributions.

## 8) Risk areas

Main risks for child UGC are:
- **Privacy.** Avoid collecting more personal data than needed; use minimal identifiers and parent/guardian consent flows. [unicef](https://www.unicef.org/innocenti/media/1096/file/%20UNICEF-Global-Insight-DataGov-data-use-brief-2020.pdf)
- **Moderation.** Children may upload faces, names, unsafe content, or culturally inaccurate material; require review before public reuse.
- **Accessibility.** Voice-only tasks can exclude some children; provide visual, tap, and facilitator-assisted alternatives. [internetmatters](https://www.internetmatters.org/hub/guidance/accessibility-video-games-designed-for-everyone/)
- **Offline/low-bandwidth.** Design the app so local creation works first and sync happens later; local storage should be the source of truth when disconnected. [developer.android](https://developer.android.com/topic/architecture/data-layer/offline-first)
- **Low-resource language support.** Pronunciation, orthography, and translation quality may be uneven; use human review for core content. [egarp](https://egarp.lt/index.php/EGJLLE/article/download/311/309)

## 9) Products to study

### ScratchJr
Officially lets ages 5–7 create interactive stories and games, with drawing and sound recording. Borrow: simple blocks, character + background editing, recorded voice, tiny interaction surface. Avoid: anything that assumes coding literacy or gets too open-ended too fast. [coderkids](https://www.coderkids.com/blog/scratchjr-projects-for-kids)

### Seesaw
Strong reference for draw, upload, and record workflows in a child artifact. Borrow: one-page multimodal response, audio labels, easy submission, and teacher review. Avoid: making the core experience feel like static schoolwork. [k12technology.weebly](https://k12technology.weebly.com/seesaw.html)

### Dojo Islands / ClassDojo
Useful for classroom challenge packaging and teacher-facing setup. Borrow: ready-made classroom agreements, challenge packets, and social motivation. Avoid: over-gamifying with opaque rewards or adult-only controls. [classdojo](https://www.classdojo.com/activity-corner/build-challenge/)

### Endless runner generators
These show the useful customization surface for runner games: character, obstacle, collectible, background, and score display. Borrow: fast skinning of art and clear level parameters. Avoid: thinking customization alone equals authorship; the child must also shape the fork logic, prompts, or level rules. [gamedeveloper](https://www.gamedeveloper.com/design/endless-runner-games-how-to-think-and-design-plus-some-history-)

### Cultural heritage games
Cultural crosswords and heritage escape games show that culture can be taught through playable tasks, not just trivia. Borrow: contextual clues, local objects, offline-friendly play, and collaborative solving. Avoid: puzzle formats that only test recall without making children speak or create. [culpeer-digital](https://culpeer-digital.eu/interactive-cultural-online-games.php)

## 10) Production recommendation

### Build now
- Draw-and-record cards.
- Endless runner with language forks.
- Projector-led collaborative quiz.
- Homework remix flow.
- Teacher/native-speaker review queue.  

### Prototype next
- Branching story map.
- Scavenger/photo quest.
- Rhythm echo game.
- Child-facing no-code builder with a very small template set.

### Research first
- Speech recognition quality for ages 5–12 in noisy rooms.
- Best moderation flow for child-uploaded drawings/audio.
- Which Kazakh cultural motifs children recognize fastest.
- Offline sync behavior under flaky mobile connections.

### Reject for now
- Fully open sandbox world-building.
- Free-text chat between children.
- Large branching authoring systems with no template constraints.
- Heavy leaderboard-first competitive loops.

## 11) Test tasks

### Child usability tasks
1. Make one runner route using your own drawing and one recorded word.
2. Play a fork decision using only sound, then only pictures.
3. Change the background and obstacle of a route.
4. Record a sentence and reuse it in a story card.
5. Fix one wrong cultural clue and resubmit it.

### Facilitator interview questions
1. Which format gets the quietest children to participate?
2. Where do children need more help: speaking, choosing, or creating?
3. Which moderation step feels too slow for a weekly class?
4. What content is safe for homework without adult help?
5. What would make you trust a child-created question or audio clip?  

If you want, I can turn this into a **fully cited source pack** next: a table with each mechanic tied to specific papers, official docs, and product pages, plus direct links you can hand to your team.