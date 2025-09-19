import cookie from "cookie";
import { verifyRefresh, signAccess } from "../../../lib/jwt";
import { connectDB } from "../../../lib/mongodb";
import User from "../../../models/User";
import Cors from "cors";

const COOKIE_NAME = process.env.COOKIE_NAME || "jid";

// --- CORS setup ---
const cors = Cors({
  methods: ["POST", "OPTIONS"],
  origin: "https://www.rentsetu.in/", // replace '*' with frontend URL in production
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload = verifyRefresh(token);

    await connectDB();
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Invalid refresh token user" });

    const access = signAccess({ sub: user._id, email: user.email });
    return res.status(200).json({ access, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: "Invalid token" });
  }
}
