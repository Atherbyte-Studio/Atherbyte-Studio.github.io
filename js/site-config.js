/*
  site-config.js — your personal details live here.
  You can edit this file directly on GitHub (open it, click the pencil icon).
  Nothing else needs to change.

  email
    Your public contact address, between the quotation marks.
    Used for the "Email us" and "Copy email address" buttons and the "Ask about this"
    links on the service cards. The same address is also written in index.html (the
    no-JavaScript email link in the Contact section, the footer link and the structured
    data), so if it ever changes, search index.html for "atherbyte.studio@" too.

  Social links (Instagram, Facebook) are written directly in index.html, in two
  places: the Contact section and the footer. Search that file for "instagram".

  testimonials
    Only add REAL feedback from real customers, like:
      { quote: "What they said.", name: "Their name", role: "Their role or company" },
    While the list is empty, the Testimonials section stays hidden.

  clientProjects
    Finished client work, like:
      {
        title: "Project name", category: "Website", description: "One or two sentences.",
        tags: [], image: "assets/images/projects/name.webp", imageAlt: "What the picture shows",
        url: "https://link-to-the-project.example"
      },
    "image", "tags" and "url" are optional.
    While the list is empty, the Portfolio section and its menu link stay hidden.
*/
window.ATHERBYTE_CONFIG = {
  email: "atherbyte.studio@gmail.com",

  /*
    account: the Atherbyte account service (used by /account/ and by the games).
      apiBaseUrl        The address of the Atherbyte API (the Cloudflare Worker), for example
                        "https://atherbyte-api.YOUR-NAME.workers.dev". Leave it "" until the Worker is deployed:
                        the account page then says accounts are not available yet, and no game is gated.
                        https only. Never put a key or password here: this file is public.
      turnstileSiteKey  The PUBLIC site key of your Cloudflare Turnstile widget (not the secret key).
                        Leave "" if the Worker runs with the security check turned off.
      features          Switches for parts that need more server work. Keep them false until that work is deployed.
                          recoveryEmail  adding and verifying a real email
                          avatarUpload   profile pictures (only ever offered after the email is verified)
  */
  account: {
    apiBaseUrl: "https://atherbyte-api.assouliwaseem391.workers.dev",   // temporary: switch to https://api.atherbyte.online once that domain is attached
    turnstileSiteKey: "0x4AAAAAAFoYIBy3fYFZeZxm",   // PUBLIC site key (safe in Git). The secret key lives only in the Worker.
    features: {
      recoveryEmail: true,
      avatarUpload: false
    }
  },

  testimonials: [
  ],

  clientProjects: [
  ]
};
