**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables. The local app uses Supabase directly, so these two variables are required before the React app can boot:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: only needed for external data imports
VITE_EXT_SUPABASE_URL=https://your-external-project-ref.supabase.co
VITE_EXT_SUPABASE_ANON_KEY=your-external-supabase-anon-key
```

You can find the Supabase URL and anon key in **Supabase > Project Settings > API**. If these values are missing, the app shows a configuration screen instead of a blank page.

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
