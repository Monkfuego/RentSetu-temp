import { OAuth2Client } from 'google-auth-library';
import { findUserByEmail, upsertUser } from '../../../lib/users';
import { signAccess, signRefresh } from '../../../lib/jwt';
import cookie from 'cookie';
import { v4 as uuidv4 } from 'uuid';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const COOKIE_NAME = process.env.COOKIE_NAME || 'jid';

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { idToken } = req.body || {};
  if(!idToken) return res.status(400).json({ error: 'idToken required' });
  try{
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email;
    let user = findUserByEmail(email);
    if(!user){
      user = { id: uuidv4(), email, createdAt: new Date().toISOString(), google: true };
      upsertUser(user);
    }
    const access = signAccess({ sub: user.id, email: user.email });
    const refresh = signRefresh({ sub: user.id });
    res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60*60*24*7
    }));
    return res.status(200).json({ access, user: { id: user.id, email: user.email } });
  }catch(e){
    console.error(e);
    return res.status(401).json({ error: 'Invalid Google ID token' });
  }
}
