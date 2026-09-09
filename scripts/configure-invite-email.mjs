// Use a server-verifiable token hash: admin invitations do not have a browser
// PKCE verifier, so the default implicit-flow redirect cannot sign users in.
process.loadEnvFile('.env.local');
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) throw new Error('Supabase management configuration is missing');
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mailer_subjects_invite: 'You’re invited to Peoplearound',
    mailer_templates_invite_content: '<h1>You’re invited to Peoplearound</h1><p>An administrator has invited you to join a local community. Accept to verify your email and activate your account.</p><p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite">Accept invitation</a></p><p>If this invitation was unexpected, you can ignore it.</p>',
  }),
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error(`Invitation template configuration failed (HTTP ${response.status})`);
console.log('Invitation template configured. No email was sent.');
