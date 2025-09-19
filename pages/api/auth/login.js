import bcrypt from "bcryptjs";
import cookie from "cookie";
import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";
import { signAccess, signRefresh } from "../../../lib/jwt";
import Cors from "cors";

const COOKIE_NAME = process.env.COOKIE_NAME || "jid";

// --- CORS setup ---
const cors = Cors({
  methods: ["POST", "OPTIONS"],
  origin: "https://www.rentsetu.in/", // replace '*' with your frontend URL in production
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

  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password || "");
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const access = signAccess({ sub: user._id, email: user.email });
  const refresh = signRefresh({ sub: user._id });

  res.setHeader(
    "Set-Cookie",
    cookie.serialize(COOKIE_NAME, refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
  );

  return res.status(200).json({
    access,
    user: { id: user._id, name: user.name, email: user.email },
  });
}
