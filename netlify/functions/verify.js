// This runs on Netlify's server, never in the visitor's browser.
// It re-checks the payment directly with Paystack before handing out the real course link.

const COURSE_LINKS = {
  literacy:  { name: "Computer & Internet Literacy",      price: 2500,  url: "https://www.youtube.com/c/GcflearnfreeOrgplus" },
  typing:    { name: "Typing & Productivity Tools",       price: 2500,  url: "https://www.typing.com" },
  python:    { name: "Intro to Coding (Python)",          price: 5000,  url: "https://www.freecodecamp.org/learn" },
  video:     { name: "Video Editing (DaVinci Resolve)",   price: 5000,  url: "https://www.freecodecamp.org/news/tag/video-editing/" },
  webdev:    { name: "Web Development (Responsive Design)", price: 10000, url: "https://www.freecodecamp.org/learn" },
  itsupport: { name: "IT Support & Troubleshooting",      price: 10000, url: "https://alison.com/course/diploma-in-information-technology-support-and-security" },
  design:    { name: "Graphic Design (Canva)",            price: 7000,  url: "https://www.canva.com/design-school/" },
  marketing: { name: "Digital Marketing & Freelancing",   price: 15000, url: "https://learndigital.withgoogle.com/digitalgarage/course/digital-marketing" }
};

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  try {
    const { reference, course } = JSON.parse(event.body || "{}");
    const c = COURSE_LINKS[course];

    if (!reference || !c) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing or unknown course/reference" }) };
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Server not configured with PAYSTACK_SECRET_KEY" }) };
    }

    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const psData = await psRes.json();

    if (!psData || !psData.data || psData.data.status !== "success") {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "Payment could not be verified" }) };
    }

    if (psData.data.amount !== c.price * 100) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "Amount does not match this course" }) };
    }

    // Verified: safe to hand over the real course link.
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, name: c.name, url: c.url })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Server error" }) };
  }
};
