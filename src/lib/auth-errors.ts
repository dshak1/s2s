// Supabase's built-in mailer allows two auth emails an hour across the whole
// project and one per address per minute, and it reports both as raw strings
// ("over_email_send_rate_limit", "For security purposes, you can only request
// this after 60 seconds") that read like a crash to anyone who sees them.
// Until custom SMTP is wired up, say what actually happened so nobody retries
// straight into the same wall — App Review included.
export function signInErrorMessage(error: {
  message?: string;
  status?: number;
  code?: string;
}): string {
  const raw = error.message ?? "";

  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    return "Too many sign-in emails have gone out just now. Wait a minute, then ask for a new code.";
  }
  if (/rate limit|only request this after/i.test(raw)) {
    return "Too many sign-in emails have gone out just now. Wait a minute, then ask for a new code.";
  }
  if (/expired|invalid/i.test(raw)) {
    return "That code is wrong or has expired. Ask for a new one.";
  }

  return raw || "That did not work. Try again in a moment.";
}
