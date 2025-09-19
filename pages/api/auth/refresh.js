import cookie from "cookie";
import { verifyRefresh, signAccess } from "../../../lib/jwt";
import { connectDB } from "../../../lib/mongodb";
import User from "../../../models/User";
import { allowCors } from "../../../lib/cors";

const COOKIE_NAME = process.env.COOKIE_NAME || "jid";

export default allowCors(async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload = verifyRefresh(token);

    await connectDB();
    const user = await User.findById(payload.sub);
    if (!user)
      return res.status(401).json({ error: "Invalid refresh token user" });

    const access = signAccess({ sub: user._id.toString(), email: user.email });

    return res.status(200).json({
      access,
      user: { id: user._id.toString(), name: user.name, email: user.email },
    });
  } catch (e) {
    console.error("Refresh token error:", e);
    return res.status(401).json({ error: "Invalid token" });
  }
});
