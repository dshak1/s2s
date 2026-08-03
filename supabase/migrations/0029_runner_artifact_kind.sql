-- say-and-shift stores its runner character as a kid_artifacts row too
-- (Profile.runnerArtifactId, kept separate from the profile avatar).

alter table kid_artifacts drop constraint if exists kid_artifacts_kind_check;
alter table kid_artifacts add constraint kid_artifacts_kind_check
  check (kind in ('tanba', 'canva', 'story', 'background', 'homework', 'runner'));
