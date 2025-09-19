import bcrypt from "bcryptjs";
import cookie from "cookie";
import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";
import { signAccess, signRefresh } from "../../../lib/jwt";
import { allowCors } from "../../../lib/cors";

const COOKIE_NAME = process.env.COOKIE_NAME || "jid";

export default allowCors(async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password || "");
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const access = signAccess({ sub: user._id.toString(), email: user.email });
  const refresh = signRefresh({ sub: user._id.toString() });

  res.setHeader(
    "Set-Cookie",
    cookie.serialize(COOKIE_NAME, refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  );

  return res.status(200).json({
    access,
    user: { id: user._id.toString(), name: user.name, email: user.email },
  });
});
