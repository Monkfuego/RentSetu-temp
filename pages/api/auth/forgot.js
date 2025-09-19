import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { connectDB } from "../../../lib/mongodb";
import User from "../../../models/User";
import Cors from "cors";

const RESET_SECRET = process.env.JWT_REFRESH_SECRET || "reset-secret";

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

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  await connectDB();
  const user = await User.findOne({ email });

  // Always respond 200 for security
  if (!user)
    return res.status(200).json({ message: "If user exists, reset email will be sent" });

  const token = jwt.sign({ sub: user._id }, RESET_SECRET, { expiresIn: "15m" });
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://rent-setu-temp.vercel.app"}/reset?token=${token}`;

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

  return res.status(200).json({ message: "If user exists, reset email will be sent" });
}
