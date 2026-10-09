/*
 * Words for the category pages (spec 12). Each page has its OWN text, written for what people in that field actually need, never one template with a
 * word swapped. A page only exists when it has at least three real products (MIN_PRODUCTS), so there are no thin pages; the sitemap follows the same rule.
 */
export const MIN_PRODUCTS = 3;

export type CategoryCopy = {
  slug: string;
  name: string; // the category name used by the catalogue ("Restaurants", "Figma kits")
  group: 'websites' | 'templates';
  title: string;
  description: string;
  h1: string;
  intro: string[];
  lookFor: string[];
  faq: [string, string][];
};

export const CATEGORIES: CategoryCopy[] = [
  {
    slug: 'restaurants',
    name: 'Restaurants',
    group: 'websites',
    title: 'Ready-made restaurant websites',
    description: 'Restaurant and cafe websites with menu, booking and gallery, live on your own domain in 1 to 7 days. Payment is held until you accept.',
    h1: 'Ready-made websites for restaurants and cafes',
    intro: [
      'A hungry visitor decides in a few seconds. The first thing they want is the menu and the price, then where you are and when you are open. The restaurant sites here put those three things on the first screen.',
      'Each one comes with a menu section you can edit, a table booking or order-ahead form, opening hours with a map, and a photo gallery. Pick one, give us your domain, and it is live in 1 to 7 days.',
    ],
    lookFor: ['A menu that is easy to change without a developer', 'Booking or ordering that sends you an email', 'Opening hours and a map that work on a phone', 'Photos that load fast'],
    faq: [
      ['Can I change the menu and prices myself?', 'Yes. The menu is plain text and images you replace, and the seller can show you how during setup.'],
      ['Does it take online orders or only table bookings?', 'Each listing says which it has. Table booking is included in most, and ordering can be added with a customisation.'],
      ['Will it work on my own domain?', 'Yes. You give us the domain, or buy one here, and the seller connects it for you.'],
    ],
  },
  {
    slug: 'health',
    name: 'Health',
    group: 'websites',
    title: 'Ready-made websites for clinics, salons and wellness',
    description: 'Websites for clinics, dentists, salons, gyms and wellness studios with online booking and service pages, live on your domain in 1 to 7 days.',
    h1: 'Ready-made websites for clinics, salons and wellness',
    intro: [
      'People choose a doctor, a dentist or a salon on trust. They look for who you are, what you offer, what it costs, and whether they can book without a phone call.',
      'These sites lead with appointment booking, a team and services page, and room for client reviews. They are written in calm, plain language, and they work on a phone, where most people book.',
    ],
    lookFor: ['Appointment booking with email reminders', 'A page for each service with prices', 'Team photos and short bios', 'A place for reviews, with respect for patient privacy'],
    faq: [
      ['Does it store patient information?', 'The booking form only collects what you ask for. If you handle medical records, keep them in a system made for that and tell your seller what you need.'],
      ['Can clients book themselves?', 'Yes, the booking section sends each request to your email, and some listings connect to a calendar tool.'],
      ['Can I show prices?', 'Yes. A services page with prices is part of every site in this group.'],
    ],
  },
  {
    slug: 'portfolios',
    name: 'Portfolios',
    group: 'websites',
    title: 'Ready-made portfolio websites',
    description: 'Portfolio websites for photographers, designers, writers and freelancers. Show your best work and get hired, live on your domain in 1 to 7 days.',
    h1: 'Ready-made portfolio websites for creative people',
    intro: [
      'A portfolio has one job: make a stranger want to hire you. Show your best eight pieces, say what you charge, and make contacting you easy. Everything else gets in the way.',
      'The portfolios here are built around a large gallery, a short story about you, and a hire-me page with your prices, so clients arrive with better questions.',
    ],
    lookFor: ['A gallery that shows your work large and loads quickly', 'A short about page with a real photo', 'A clear hire-me page with prices', 'A contact form that reaches you'],
    faq: [
      ['How many pieces should I show?', 'Eight to twelve of your best. Fewer strong pieces beat many average ones.'],
      ['Can I add new work later?', 'Yes. The gallery is images you swap, and the seller can show you how.'],
      ['Is it good for search?', 'The pages are plain and fast, which helps. Add a sentence about each piece so people can find you.'],
    ],
  },
  {
    slug: 'stores',
    name: 'Stores',
    group: 'websites',
    title: 'Ready-made online store websites',
    description: 'Small online stores with product pages, collections and shipping information, live on your own domain in 1 to 7 days. Start small and grow.',
    h1: 'Ready-made online stores',
    intro: [
      'Most new shops do not need a huge system. They need ten good products, clear photos, honest shipping and returns pages, and a simple way to pay. That is how the stores here start.',
      'Each one has product pages, collections, a basket and a shipping and returns page. You connect your payment and shipping, and the seller can help with that as part of setup.',
    ],
    lookFor: ['Product pages with several photos', 'Collections so people can browse', 'Clear shipping and returns information', 'A basket and a payment you connect yourself'],
    faq: [
      ['Which payment provider does it use?', 'Each listing says. You connect your own account, so the money goes straight to you.'],
      ['How many products can I add?', 'Start with ten and grow. The listing says how large it is built to go.'],
      ['Can the seller connect shipping for me?', 'Yes, choose the setup help option and say which carrier you use.'],
    ],
  },
  {
    slug: 'landing-pages',
    name: 'Landing pages',
    group: 'websites',
    title: 'Ready-made landing pages',
    description: 'One-page sites for launching a product, collecting sign-ups or promoting an event. Clear message, strong call to action, live in 1 to 7 days.',
    h1: 'Ready-made landing pages that turn visitors into sign-ups',
    intro: [
      'A landing page works when a visitor understands what it is, who it is for and what to do next, all in five seconds. Everything on the page should help with that.',
      'These pages have one clear promise at the top, three reasons to believe it, proof from real people, and one button. They are fast, they look right on a phone, and you can change the words yourself.',
    ],
    lookFor: ['A headline that says what you do and for whom', 'One main button, repeated', 'Proof: logos, numbers or short quotes', 'A form that sends sign-ups to your inbox'],
    faq: [
      ['Where do the sign-ups go?', 'To your email, and most listings can connect to a mailing list tool you already use.'],
      ['Can I run ads to it?', 'Yes. Keep one goal per page and send each ad to the page that matches it.'],
      ['How long does it take?', 'One to three days after you pay and give us your domain.'],
    ],
  },
  {
    slug: 'real-estate',
    name: 'Real estate',
    group: 'websites',
    title: 'Ready-made real estate websites',
    description: 'Websites for agents and landlords with listings, filters and viewing requests, live on your own domain in 1 to 7 days.',
    h1: 'Ready-made websites for real estate and rentals',
    intro: [
      'People search for a home by area, price and size. A property site that lets them filter on those three, and ask for a viewing in one tap, gets more enquiries than a page of photos.',
      'These sites have a listings page with filters, a page for each property, a viewing request form and a short neighbourhood guide that helps people find you through search.',
    ],
    lookFor: ['Filters for area, price and size', 'A page for each property with many photos', 'A viewing request form', 'Useful local pages that bring visitors from search'],
    faq: [
      ['Can I add and remove properties myself?', 'Yes, each property is a simple page you copy and edit.'],
      ['Does it show a map?', 'Most listings include a map for the office and for each property.'],
      ['Can it connect to my listing feed?', 'Ask the seller about customisation if you need to import listings automatically.'],
    ],
  },
  {
    slug: 'tools',
    name: 'Tools',
    group: 'websites',
    title: 'Ready-made small web tools and calculators',
    description: 'Small web tools, calculators and micro-apps you can put on your own domain in 1 to 7 days. See each one working before you buy.',
    h1: 'Ready-made small web tools and calculators',
    intro: [
      'A small tool that does one thing well, like a calculator, a converter or a quote builder, brings visitors back and gives you something to share. Building one from nothing is slow. Starting from a working one is not.',
      'Every tool here has a live demo you can try, a plain description of what it does, and the files come to you once your payment is held in escrow, so you can check them during your review.',
    ],
    lookFor: ['A demo you can use before you pay', 'One clear job, done well', 'Plain code you or a developer can change', 'A description of what is included'],
    faq: [
      ['Can I change how it looks and what it says?', 'Yes. The files are yours to edit on your own domain, within the licence on the listing.'],
      ['Does it need a server?', 'The listing says whether it runs in the browser only or needs hosting. Hosting is an optional extra.'],
      ['What if it does not work?', 'You have 48 hours to check it, and a dispute if it is not as described.'],
    ],
  },
  {
    slug: 'figma-ui-kits',
    name: 'Figma kits',
    group: 'templates',
    title: 'Figma UI kits and design templates',
    description: 'Figma UI kits, dashboards and design systems from independent designers. See the preview, get the file at once after payment, with a licence.',
    h1: 'Figma UI kits and design templates',
    intro: [
      'A good UI kit saves days of work: real components, sensible spacing, and a type and colour system you can change in one place. The kits here show their screens up front so you can judge them before you pay.',
      'You get the Figma file straight after your payment is held, a licence key, and 48 hours to check it. Each listing says what is inside: pages, components, styles and whether it uses auto layout and variables.',
    ],
    lookFor: ['Components with variants, not flat pictures', 'Auto layout and variables so it adapts', 'Light and dark versions', 'A clear licence for client work'],
    faq: [
      ['Can I use it for client projects?', 'It depends on the licence on the listing: single project or multi project. Read it before you buy.'],
      ['Does the file come at once?', 'Yes. A download link, valid for 24 hours and renewable, appears once your payment is in escrow.'],
      ['Can I ask the designer a question first?', 'Yes, every listing has an ask-the-seller box.'],
    ],
  },
  {
    slug: 'no-code-templates',
    name: 'No-code templates',
    group: 'templates',
    title: 'No-code templates for Notion, Webflow, Framer and more',
    description: 'No-code templates for Notion, Webflow, Framer, WordPress and Shopify. Preview first, files at once after payment, licence included.',
    h1: 'No-code templates for Notion, Webflow, Framer and more',
    intro: [
      'No-code tools let you build without a developer, but a blank canvas is slow. A template gives you a structure that already works, and you fill in your own words and pictures.',
      'These templates name the tool they are for, show a preview, and say what is included. You get the link or file once your payment is held, and 48 hours to check that it does what the listing says.',
    ],
    lookFor: ['The tool and version it is made for', 'A preview or view-only link', 'Setup notes, ideally with screenshots', 'Free fixes for a period after you buy'],
    faq: [
      ['Which tool is it for?', 'Each listing names it, for example Notion, Webflow, Framer, WordPress or Shopify.'],
      ['Do I need a paid plan of the tool?', "Sometimes. The listing says what you need, and prices are the tool maker's, not ours."],
      ['Is support included?', 'Many sellers include fixes for a month. It is on the listing.'],
    ],
  },
  {
    slug: 'plugins',
    name: 'Plugins',
    group: 'templates',
    title: 'Plugins and add-ons for WordPress, Shopify and more',
    description: 'Plugins and add-ons from independent developers. A working demo on every listing, files at once after payment, 48 hours to check.',
    h1: 'Plugins and add-ons',
    intro: [
      'A plugin runs on your site, so you should be able to see it work before you pay. Every plugin here has a demo link, and we read each listing before it goes live.',
      'You get the files straight after your payment is held in escrow, with a licence key, and 48 hours to try them. If something is harmful or does not work, you can open a dispute and the money stays held.',
    ],
    lookFor: ['A working demo, not only screenshots', 'The platform and versions it supports', 'A licence file and the third-party code it includes', 'A changelog and a way to get fixes'],
    faq: [
      ['Is it safe to install?', 'We check listings and the seller must declare what is inside, but no check is perfect. Try it on a copy of your site first, which you can do in your 48 hours.'],
      ['Will it work with my version?', 'The listing names the versions it was made for. Ask the seller if you are unsure.'],
      ['What if it breaks my site?', 'Open a dispute within the review window. Payment stays held while we decide.'],
    ],
  },
  {
    slug: 'scripts',
    name: 'Scripts',
    group: 'templates',
    title: 'Scripts and automation code',
    description: 'Ready-made scripts for scraping, reports, SEO checks and automation. See it run before you buy, get the code at once after payment.',
    h1: 'Scripts and automation code',
    intro: [
      'A script that works is worth hours of your time. The ones here come with a demo or a sample result so you can see what it does before you pay, and a plain list of what it needs to run.',
      'The code reaches you the moment your payment is held, through a private link and, for some, a repository invite. You have 48 hours to run it. Pasted passwords or keys are checked for before a listing goes live.',
    ],
    lookFor: ['A sample of the output, or a video of it running', 'The language, version and packages it needs', 'A readme with setup steps', 'No secrets or hidden network calls in the code'],
    faq: [
      ['Can I read the code before I run it?', 'Yes. You get the full source. Read it, and run it in a safe place first.'],
      ['Who owns the code?', 'The licence on the listing says: single project, multi project or full transfer.'],
      ['What if it does not do what the demo showed?', 'That is a not-as-described dispute. Payment is held until it is decided.'],
    ],
  },
  {
    slug: 'ai-automations',
    name: 'AI automations',
    group: 'templates',
    title: 'AI automations for n8n, Make and Zapier',
    description: 'Ready-made n8n, Make and Zapier workflows with AI steps: lead capture, reports, support and more. Demo included, import in minutes.',
    h1: 'AI automations for n8n, Make and Zapier',
    intro: [
      'An automation saves the same ten minutes every day. Building one means learning a tool, wiring steps, and fixing the one that always fails. These workflows are already wired, and you add your own keys.',
      'Each listing shows the workflow, names the tools it connects, and says which keys you need. You import the file, connect your accounts, and have 48 hours to check it runs.',
    ],
    lookFor: ['A picture or video of the whole workflow', 'The apps and keys it needs, listed', 'What happens when a step fails', 'The cost of the tools it uses, which is not ours to set'],
    faq: [
      ['Do I pay for the AI model separately?', 'Yes, with your own account. Use limits on your account so a mistake cannot cost much.'],
      ['Will it work in Make if it is for n8n?', 'No. Each workflow is made for one tool, named on the listing.'],
      ['Can the seller set it up for me?', 'Choose setup help and say which accounts you use. The seller works on it first.'],
    ],
  },
  {
    slug: 'ai-prompts',
    name: 'AI prompts',
    group: 'templates',
    title: 'AI prompt packs and image workflows',
    description: 'Prompt packs for ChatGPT and Midjourney, ComfyUI workflows and SEO writing frameworks, each with sample results you can judge before buying.',
    h1: 'AI prompt packs and image workflows',
    intro: [
      "A prompt pack is somebody else's hours of trial and error, written down. Image prompts that keep one style across a set, ComfyUI graphs already wired, writing frameworks for product pages and blog posts that rank.",
      'Every listing shows real outputs made with its prompts, and names the model and version it was tested on. Results change when a model is updated, so check the samples, then try the pack yourself within 48 hours of getting the files.',
    ],
    lookFor: [
      'Sample outputs made with these exact prompts',
      'The model and version they were tested on',
      'Notes on which words to change for your own use',
      'For ComfyUI: the custom nodes and model files it needs',
    ],
    faq: [
      ['Will I get the same images as the samples?', 'Close, not identical. Image models give a different result each time, and updates change them.'],
      ['Can I use what I make with them in paid work?', "The listing licence covers the prompts. What you make is also bound by the model provider's own rules."],
      ['Does a ComfyUI workflow include the model files?', 'No. It lists the models and nodes to download from their own sources.'],
    ],
  },
  {
    slug: 'video-templates',
    name: 'Video templates',
    group: 'templates',
    title: 'Video templates for Premiere Pro, After Effects and CapCut',
    description: 'Intros, outros, lower thirds and title packs for Premiere Pro, After Effects and CapCut. Watch the preview video first, edit text and colours.',
    h1: 'Video templates for Premiere Pro, After Effects and CapCut',
    intro: [
      'Motion design takes days to do well. A template gives you the animation already timed, and you change the words, colours and logo. Intros, outros, lower thirds, transitions and social media formats.',
      'Each listing has a preview video and says which app and version it opens in. Music and fonts often have their own licences: the seller lists what is included and what you must get yourself.',
    ],
    lookFor: ['A preview video of every scene', 'The app and the lowest version it opens in', 'Whether music and fonts are included, and on what licence', 'Sizes included: wide, square, upright'],
    faq: [
      ['Will an After Effects template open in Premiere Pro?', 'Only if the listing says so. Each template is made for the app it names.'],
      ['Is the music included?', 'Only when the listing says so and names its licence. Otherwise add your own.'],
      ['Do I need plugins?', 'The listing must name any paid plugin it needs. Ask the seller before buying if unsure.'],
    ],
  },
  {
    slug: 'chatbots',
    name: 'Chatbots',
    group: 'templates',
    title: 'Ready-made chatbots and support widgets',
    description: 'Chatbots and support widgets for your website, with a live demo. Answer common questions and capture leads, files at once after payment.',
    h1: 'Ready-made chatbots and support widgets',
    intro: [
      'A good chatbot answers the same five questions your customers always ask and hands the rest to you. A bad one annoys people. The chatbots here have a live demo so you can talk to them first.',
      'You get the widget code and setup notes the moment your payment is held. You bring your own answers, and the model account if the bot uses one, then check it all within 48 hours.',
    ],
    lookFor: ['A live demo you can chat with', 'How it hands over to a person', 'What data it stores and where', 'A simple way to edit its answers'],
    faq: [
      ['Does it use an AI model?', 'Some do. The listing says which, and the model account and its cost are yours.'],
      ['Where do the conversations go?', 'The listing says. Check it matches your privacy needs before you buy.'],
      ['Can I change what it says?', 'Yes. Answers are text you edit, and the seller can help with setup.'],
    ],
  },
];

export const categoryFor = (group: CategoryCopy['group'], slug: string) => CATEGORIES.find((c) => c.group === group && c.slug === slug);
