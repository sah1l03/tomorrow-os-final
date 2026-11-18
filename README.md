# TomorrowOS Final

TomorrowOS brings classes, deadlines, shifts, personal plans, and roommate schedules into one calendar. The Today page shows the next event, a timeline, and quick tasks. Use the **Example week** to explore with sample data before creating an account.

## Run locally

Use Node.js 22 or newer. Open Terminal in the extracted TomorrowOS-Final folder, where package.json is located.

1. For your existing account, copy the .env.local from your working TomorrowOS folder into this folder. For a new setup, copy .env.example to .env.local and set the Supabase project URL and publishable key. See the database section below.
2. Install and run the project:

   ~~~sh
   npm ci
   npm run dev
   ~~~

3. Open [http://localhost:3000](http://localhost:3000) or the local URL Terminal prints. The app opens the interactive example when Supabase settings are blank. With Supabase configured, sign in with your existing TomorrowOS account.

Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY using the **Connect** or **API Keys** screen of your Supabase project. A legacy anon key can go in the publishable key variable. For syllabus PDF analysis, set GEMINI_API_KEY on the server. Keep .env.local outside Git.

For local signups with email confirmation, allow http://localhost:3000/auth/confirm in Supabase Auth redirect URLs. Open the email in the same browser you used to sign up.

## Database setup

- **Existing V1.5 project:** Use your same Supabase project and accounts. Its V1.5 schema supports TomorrowOS Final.
- **Older TomorrowOS database:** Run only the migrations you have yet to apply, in filename order from [supabase/migrations](supabase/migrations). On V1.4, the two remaining migrations add profiles and personal-event repeats. Apply them in the Supabase SQL Editor.
- **Empty Supabase project:** Run [supabase/setup-new-project.sql](supabase/setup-new-project.sql) once in the SQL Editor. It applies all eleven migrations together.

## Features

- **Today:** See what’s next, view the week, check off quick tasks, or add a class, deadline, shift, personal event, or task from one menu.
- **Example week:** Add a sample event or complete a task at /example. The example is separate from account data and resets on reload.
- **Syllabus import:** Upload one PDF up to 4 MB. Gemini analyzes the PDF when configured. Review and save the classes and deadlines you choose.
- **Calendar:** Switch between Month, Week, Day, and Agenda. New calendar visits start in Week on desktop and Agenda on phones. Classes, shifts, and personal events support repeats. Schedule times use America/Halifax.
- **Work:** Add a one-time or repeating shift, including overnight shifts, or import timed shifts from an .ics file.
- **Shared:** Invite a roommate with a one-time code. Choose who can see Busy blocks or details, open calendars separately or together, and send messages or event suggestions for approval.
- **Availability:** Copy or export a week as an .ics file. The file includes timed items marked Busy only or Shared details and labels each block Busy. Private items, titles, locations, notes, and roommates’ calendars stay out of the export.
- **Profile and appearance:** Set a username and private profile photo. Choose Light or Dark mode, change the scene, and adjust motion.

## Push and deploy

Run npm run lint and npm run build to check the project. Follow [DEPLOY.md](DEPLOY.md) for GitHub and hosting. Keep package.json, src, public, and supabase at the root of the GitHub repository.
