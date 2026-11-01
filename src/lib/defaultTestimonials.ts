// The reviews the landing page shows until the superadmin adds their own
// (Superadmin > Landing Reviews). Also used by that page's "Import" button.
export type TestimonialItem = {
  quote: string;
  name: string;
  role: string;
  city: string;
};

export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    quote:
      "Fee follow-ups used to eat my afternoons — typing the same reminder to forty parents on WhatsApp every month. Now overdue fees show up on one screen and parents pay through the Razorpay link themselves. I've stopped chasing anyone.",
    name: "Priya Deshmukh",
    role: "Founder, Zenith IIT-JEE Academy",
    city: "Pune",
  },
  {
    quote:
      "Parents used to ask if we were a “real” institute before enrolling their kids. Now I just send them our own page at institutesathi.com/iyers-spoken-english with our logo on it, and that question doesn't come up any more.",
    name: "Rajesh Iyer",
    role: "Director, Iyer's Spoken English Institute",
    city: "Chennai",
  },
  {
    quote:
      "Assignment submissions auto-lock the moment the due date passes, so students can't upload at midnight and blame a “technical issue.” I've stopped making follow-up calls just to chase homework.",
    name: "Anjali Mehta",
    role: "Administrator, Mehta CA Coaching Classes",
    city: "Ahmedabad",
  },
  {
    quote:
      "Our lecture recordings play inside the dashboard's own player instead of a raw YouTube link, so students rewatch the actual class instead of drifting off into recommended videos.",
    name: "Suresh Nair",
    role: "Owner, Nair's NEET Point",
    city: "Kochi",
  },
  {
    quote:
      "Every new term I used to re-enter the same sixty students one by one. With student groups I add our returning batch in a single click and everyone's set up with the right subjects immediately.",
    name: "Kavita Sharma",
    role: "Center Head, Sharma Tuition Center",
    city: "Lucknow",
  },
  {
    quote:
      "Parents and students check attendance and results on their own dashboard now instead of calling the office. It's the single change that freed up the most time for our staff.",
    name: "Vikram Rao",
    role: "Founder, Rao's Commerce Academy",
    city: "Hyderabad",
  },
];
