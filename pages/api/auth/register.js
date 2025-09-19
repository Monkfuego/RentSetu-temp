import bcrypt from "bcryptjs";
import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { email, password, name } = req.body || {};
  if (!email || !password || !name)
    return res.status(400).json({ error: "name, email and password required" });

  await connectDB();

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashed,
    google: false,
  });

  // --- NodeMailer welcome email ---
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g., smtp.gmail.com
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true if port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"RentSetu" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Welcome to RentSetu!",
      html: `<h1>Hello ${user.name},</h1>
             <p>Welcome to RentSetu! We're excited to have you on board.</p>`,
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }

  return res.status(201).json({
    message: "Registered",
    user: { id: user._id, name: user.name, email: user.email },
  });
}
