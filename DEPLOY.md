# Put TomorrowOS online

GitHub stores and shares the code. Vercel runs the app and gives roommates a link they can open in a browser. You can keep the repository private and still let people use the hosted app.

## 1. Push the source to GitHub

From your own GitHub account, [create an empty repository](https://github.com/new) named `tomorrow-os`, or `tomorrow-os-final` if that name is taken on your account. Choose **Private** if you want to decide who sees the code. Leave the README, license, and Git ignore options unchecked; the source already includes a README and Git ignore rules.

Unzip `TomorrowOS-Final.zip`. In Terminal, open the extracted folder that contains `package.json`. Run these commands, replacing the example email with an email verified on your GitHub account or your GitHub-provided no-reply address. These Git settings apply only to this folder.

```sh
git init -b main
git config user.name "Your name"
git config user.email "YOUR_GITHUB_EMAIL"
git add .
git status --short
```

Check the list before you commit: `.env.example` is fine; `.env.local`, `node_modules/`, and `.next/` should be absent. To push the code from a borrowed laptop, you do not need to copy any app keys to it.

```sh
git commit -m "Add TomorrowOS Final"
git remote add origin YOUR_GITHUB_HTTPS_URL
git -c credential.helper= push -u origin main
```

Replace `YOUR_GITHUB_HTTPS_URL` with the HTTPS URL from your new repository’s page. If you get a username and password prompt, enter your GitHub username and use a [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) as the password. Limit it to the new repository with **Contents: Read and write**, set a short expiry, and revoke it after the push. Paste it into the password prompt only. The command disables Git’s credential helpers for this push.

To update an existing repository instead, clone it and copy the release files into the clone. Keep its existing `.git` directory. Review and remove any obsolete starter files, such as an old top-level `app/` directory that would take precedence over `src/app/`. Commit and push the reviewed changes normally.

Refresh the repository page to verify that `src`, `supabase`, and `package.json` appear. To share a private repository with trusted friends, use **Settings → Collaborators**. Collaborators on a personal private repository can also push changes. Roommates who only use the app can skip this step.

## 2. Deploy on Vercel

1. Sign in to [Vercel](https://vercel.com/) with your GitHub account. Under **Add New → Project**, import the TomorrowOS repository. Give the Vercel GitHub app access to that repository.
2. Use **Next.js** as the framework and leave the root directory at the repository root. Use Node.js 22.x or newer.
3. In **Environment Variables**, add the two required values for the Supabase project you want to use:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
   | `GEMINI_API_KEY` | Optional. Server-side key for PDF analysis |
   | `GEMINI_MODEL` | Optional. Override the default syllabus analysis model |

   Use production variables for the live site. Use a separate Supabase project for previews if you want to test changes without touching live data. Supabase service-role keys and database passwords are not needed. After changing an environment variable in Vercel, redeploy so the new value takes effect.

4. Click **Deploy**. In the project’s **Domains**, copy its production URL, such as `https://tomorrow-os-example.vercel.app`.

## 3. Let roommates sign up

1. In Supabase, go to **Authentication → URL Configuration**. Set **Site URL** to your Vercel production URL. Under **Redirect URLs**, add that URL with `/auth/confirm` on the end. Keep `http://localhost:3000/auth/confirm` if you still develop locally.
2. Keep email confirmation enabled. Supabase’s built-in mailer only delivers to project team addresses. To support signup for roommates, [configure custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) in Supabase Auth and test that a new non-team account gets the confirmation email. Open the link in the same browser used for signup. Already confirmed accounts can log in before SMTP is configured.
3. Open the production link in a private browser window. You should see TomorrowOS’s sign-in page. If you see a Vercel sign-in instead, use the production domain rather than a deployment-specific preview link and check the project's **Deployment Protection** settings.
4. Share the production link. Each roommate makes their own TomorrowOS account. Use **Shared** inside the app to grant access to specific events or availability.

Verify the first launch with two accounts. Save a personal event, confirm the other account cannot see it while it is private, then share it deliberately and check the result on both accounts.
