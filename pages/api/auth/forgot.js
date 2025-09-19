import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { connectDB } from "../../../lib/mongodb";
import User from "../../../models/User";
import { allowCors } from "../../../lib/cors";

const RESET_SECRET = process.env.JWT_REFRESH_SECRET || "reset-secret";

export default allowCors(async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email required" });

  await connectDB();

  const user = await User.findOne({ email });

  // Always respond 200 to avoid leaking which emails exist
  if (!user) {
    return res
      .status(200)
      .json({ message: "If user exists, reset email will be sent" });
  }

  const token = jwt.sign({ sub: user._id }, RESET_SECRET, { expiresIn: "15m" });
  const resetUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "https://rent-setu-temp.vercel.app"
  }/reset?token=${token}`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Password reset",
      text: `Reset your password using this link: ${resetUrl}`,
    });

    console.log("Reset link sent:", resetUrl);
  } catch (e) {
    console.error("Email sending failed. Link:", resetUrl, e);
  }

  return res
    .status(200)
    .json({ message: "If user exists, reset email will be sent" });
});
