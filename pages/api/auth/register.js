import bcrypt from "bcryptjs";
import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";
import nodemailer from "nodemailer";
import Cors from "cors";

// --- CORS setup ---
const cors = Cors({
  methods: ["POST", "OPTIONS"],
  origin: "https://www.rentsetu.in", // replace '*' with your frontend URL in production
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

  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
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
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
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
