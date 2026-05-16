import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { db_ops } from "./db.js";

const SESSION_COOKIE = "__Host-fisz-id";

export function createSession(user, res) {
  let sessionId = randomBytes(32).toString("hex");
  let createdAt = Date.now();

  let session = db_ops.create_session.get(sessionId, user, createdAt);
  res.locals.session = session;
  res.cookie(SESSION_COOKIE, session.id.toString(), {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
  });
  return session;
}

export function getSession(req, res, next) {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  console.log("getsession", sessionId);
  if (!sessionId) {
    res.locals.session = null;
    return next();
  }

  const session = db_ops.get_session.get(sessionId);

  if (!session) {
    res.locals.session = null;
    res.clearCookie(SESSION_COOKIE);
    return next();
  }

  res.locals.session = session;
  next();
}

export async function seedAdmin() {
  const adminExists = db_ops.check_login_exist.get("admin");
  if (!adminExists) {
    const adminHash = await argon2.hash("admin123");
    db_ops.insert_user.run("admin", adminHash, 1);
    console.log("Utworzono konto administratora: admin / admin123");
  }
}
