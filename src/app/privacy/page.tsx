import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Steppe to Screen",
  description: "How Steppe to Screen handles learner, team, and app usage data.",
};

const PRIVACY_EMAIL = "dshakimov@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-warm px-5 py-12 text-steppe sm:px-8">
      <article className="mx-auto max-w-3xl rounded-[1.75rem] border-2 border-steppe/15 bg-white p-6 shadow-[5px_6px_0_0_rgba(30,77,140,.10)] sm:p-10">
        <Link href="/" className="text-sm font-black underline decoration-2 underline-offset-4">
          ← Steppe to Screen
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm font-bold text-wolf">Effective August 17, 2026</p>

        <div className="mt-8 space-y-8 text-base font-semibold leading-7 text-steppe/85">
          <section>
            <h2 className="text-2xl font-black text-steppe">The short version</h2>
            <p className="mt-2">
              Steppe to Screen is a Kazakh-language learning app for children. Children can play without
              an email account. We do not sell personal information, show advertising, or track people
              across other companies&apos; apps or websites. The app creates a random learner ID, keeps a
              working copy of progress on the device, and—when online—syncs learner progress and game
              activity to our service so it can be recovered and used to improve the lessons.
            </p>
            <p className="mt-3 rounded-2xl border-2 border-gold/50 bg-[#fff8d9] p-4 text-steppe">
              Please use a nickname rather than a child&apos;s full legal name, and do not put private or
              sensitive information into drawings, homework notes, feedback, or shared artwork.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-steppe">Information the app handles</h2>
            <ul className="mt-3 list-disc space-y-3 pl-6">
              <li>
                <strong>Learner profile:</strong> a random learner ID, an optional nickname, language
                preference, recovery information, points, badges, and chosen artwork or settings.
              </li>
              <li>
                <strong>Gameplay and learning activity:</strong> games played, scores, vocabulary and
                letters practised, answers selected or typed, whether an answer was correct, response
                time, hints used, audio replays, and learning progress. When online, this information is
                automatically sent to our hosted service and associated with the random learner ID.
              </li>
              <li>
                <strong>Workshop activity:</strong> a session code, table number, attendance, and live-game
                progress if the learner joins a supervised online workshop.
              </li>
              <li>
                <strong>Photos, drawings, and other creations:</strong> artwork, characters, backgrounds,
                homework images, titles, labels, dates, and notes that a user chooses to create or select.
                These items are kept on the device and are also uploaded when online so they can be
                restored. If a user taps <em>Share to gallery</em>, the character and nickname enter a
                staff review queue and may become visible to other users only after approval.
              </li>
              <li>
                <strong>Speech:</strong> after microphone permission is granted and a pronunciation feature
                is started, short audio clips are sent through our server to ElevenLabs and, when needed,
                Groq for transcription. We do not store learner microphone clips or their transcripts in
                our own database. The speech providers may retain request data under their own terms and
                account settings. The random learner ID is used by our server for rate limiting but is not
                sent to the speech provider with the clip.
              </li>
              <li>
                <strong>Feedback and support:</strong> a message, feedback type, the screen it came from,
                the random learner ID, and an optional image or screenshot when a user chooses to send
                feedback. Email sent to support also contains the sender information supplied by the email
                service.
              </li>
              <li>
                <strong>Team accounts:</strong> email address, display name, role, authentication records,
                and review or moderation activity for authorized educators, researchers, and developers.
              </li>
              <li>
                <strong>Technical service data:</strong> hosting and security providers may process IP
                addresses, browser or device information, timestamps, and request or error logs needed to
                deliver and protect the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-steppe">Why we use this information</h2>
            <p className="mt-2">
              We use it to run the games, remember and restore progress, provide optional speech and
              creative tools, support supervised workshops, moderate shared artwork, answer support
              requests, prevent misuse, and understand which learning questions are working well. We do
              not use it for targeted advertising or cross-app tracking.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-steppe">Local and online storage</h2>
            <p className="mt-2">
              The app is local-first: a working copy of the learner profile, progress, and recent creations
              is stored on the device. When an internet connection and our online service are available,
              the app automatically syncs the learner profile, learning progress, answer activity, game
              results, and uploaded creations to Supabase. Deleting the app, clearing its website data, or
              using the profile reset removes the local copy; it does not by itself delete an existing
              server copy. A parent, guardian, or account holder can request server-side deletion using the
              instructions below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-steppe">Service providers</h2>
            <p className="mt-2">We use the following providers to operate Steppe to Screen:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>Vercel</strong> for web hosting, server requests, and operational logs.</li>
              <li><strong>Supabase</strong> for database, authentication, realtime features, and file storage.</li>
              <li><strong>ElevenLabs and Groq</strong> for optional speech-to-text processing.</li>
              <li><strong>Resend</strong> for team sign-in and operational email.</li>
              <li>
                <strong>Maze</strong> for research on the public website. Maze is not loaded inside the iOS
                or Android app.
              </li>
            </ul>
            <p className="mt-3">
              These companies process data only to provide their services to us and under their own
              privacy, security, and retention terms. Information may be processed in Canada, the United
              States, or other countries where a provider operates. We require providers to protect data
              consistently with this policy and applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-steppe">Children and family choices</h2>
            <p className="mt-2">
              Steppe to Screen is designed for families and supervised educational settings. We do not ask
              a child for an email address, phone number, exact location, contacts, or payment information
              in order to play. A parent, guardian, or supervising educator should decide whether a child
              uses optional microphone, camera, photo, homework-upload, feedback, or gallery-sharing
              features. Permission can be refused or withdrawn in the device settings; pronunciation games
              retain on-screen controls when microphone access is unavailable.
            </p>
          </section>

          <section id="choices" className="scroll-mt-8">
            <h2 className="text-2xl font-black text-steppe">Your privacy choices</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Play without creating an email account.</li>
              <li>Decline Camera, Photos, or Microphone access in device settings.</li>
              <li>Do not submit optional feedback, uploads, or artwork to the shared gallery.</li>
              <li>Delete individual creations from the in-app gallery.</li>
              <li>Delete local information by resetting the profile, deleting the app, or clearing its data.</li>
              <li>Ask us to access, correct, export, or delete server-side information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-steppe">Retention and deletion</h2>
            <p className="mt-2">
              Local information remains until it is deleted or the app&apos;s data is cleared. Server-side
              learner profiles, progress, creations, and associated activity are kept while the profile or
              educational program is active and until they are deleted or de-identified. Feedback, support,
              moderation, and security records are kept for as long as reasonably needed to resolve the
              matter, protect the service, and meet legal obligations. Service-provider logs and backups
              expire according to the provider&apos;s retention controls.
            </p>
            <p className="mt-3">
              To request access, correction, export, or deletion, email{" "}
              <a
                className="font-black underline decoration-2 underline-offset-4"
                href={`mailto:${PRIVACY_EMAIL}?subject=Steppe%20to%20Screen%20Privacy%20Request`}
              >
                {PRIVACY_EMAIL}
              </a>
              . Include the learner recovery code or random profile ID, or the team-account email, so we
              can locate the correct record. Do not send a child&apos;s full legal name if the recovery code is
              enough. We may need to verify that the requester is authorized before releasing or deleting
              information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-steppe">Security</h2>
            <p className="mt-2">
              We use encrypted network connections, access controls, randomized learner identifiers, and
              staff-only review tools to protect information. No system is perfectly secure, so we collect
              less information from children where practical and do not use advertising identifiers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-steppe">Contact and policy changes</h2>
            <p className="mt-2">
              For privacy questions or requests, email{" "}
              <a
                className="font-black underline decoration-2 underline-offset-4"
                href={`mailto:${PRIVACY_EMAIL}`}
              >
                {PRIVACY_EMAIL}
              </a>
              . We may update this policy when the app or its providers change. The effective date above
              identifies the current version.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
