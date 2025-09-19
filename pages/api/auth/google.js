import { OAuth2Client } from "google-auth-library";
import User from "../../../models/User"; // Mongoose model
import { signAccess, signRefresh } from "../../../lib/jwt";
import cookie from "cookie";
import dbConnect from "../../../lib/mongodb"; // MongoDB helper
import { allowCors } from "../../../lib/cors";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const COOKIE_NAME = process.env.COOKIE_NAME || "jid";

export default allowCors(async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: "idToken required" });

  try {
    await dbConnect();

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || "Google User";

    // Find or create user in DB
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        name,
        google: true,
        googleId: payload.sub,
        createdAt: new Date(),
      });
      await user.save();
    }

    // Generate JWTs
    const access = signAccess({ sub: user._id.toString(), email: user.email });
    const refresh = signRefresh({ sub: user._id.toString() });

    // Set refresh token cookie
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
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
  } catch (e) {
    console.error("Google Auth Error:", e);
    return res.status(401).json({ error: "Invalid Google ID token" });
  }
});
