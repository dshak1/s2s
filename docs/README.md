# Steppe to Screen — internal docs

Kazakh language and culture games for kids 5–12, plus the tooling the team uses
to make them better.

The app has two populations and they are treated oppositely:

- **Kids** are anonymous. No login, localStorage-first, works with zero backend.
  Nothing here asks them for anything.
- **The team** — educators, native speakers, developers — sign in with a magic
  link and are the only people who can read data across rows.

| Doc | What it covers |
|---|---|
| [session-log.md](session-log.md) | Every idea raised, what happened to it, and why |
| [team-context.md](team-context.md) | Who the team is and how the workshops actually run |
| [backlog.md](backlog.md) | Everything shipped, everything open. Mirrors /tickets |
| [setup.md](setup.md) | Getting it running, env vars, the manual Supabase steps |
| [architecture.md](architecture.md) | How the pieces fit, and why offline-first |
| [data-model.md](data-model.md) | Every table, what it is for, who can read it |
| [telemetry.md](telemetry.md) | How an answer becomes a row, and how to add a game |
| [labelling-guide.md](labelling-guide.md) | The rubric raters actually use |
| [research.md](research.md) | The research questions and the benchmark |
| [security.md](security.md) | The access model and its known gaps |
| [photo-credits.md](photo-credits.md) | Where every place photo came from, and its licence |
| [roadmap.md](roadmap.md) | What is built, what is next |
| [next-plan.md](next-plan.md) | The current plan, written to be executed |
| [demo-script.md](demo-script.md) | The four-minute walkthrough |

## The short version

Every question a kid answers becomes a row in `learning_events`, keyed to a
stable content id. That data says *which* questions are broken. Educators and
native speakers then say *why*, in `labels`. Together those two tables are the
thing nobody else has for Kazakh, and they get more valuable every workshop.

Around that sit the surfaces that make the work visible: a dashboard, an idea
board where every idea gets a written answer, and a labelling queue that credits
whoever did the judging.
