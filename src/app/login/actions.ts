"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Where to land afterwards.
 *
 * Someone who scanned a poster, read the event and pressed "I'm in" should
 * come back to that event once they have an account — losing them on a
 * generic home page is where a flyer stops working. Only ever an internal
 * path: an absolute URL here would make the sign-in form an open redirect,
 * which is a phisher's favourite shape.
 */
function safeNext(formData: FormData): string {
  const raw = String(formData.get("next") ?? "").trim().slice(0, 300);
  return /^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/.test(raw) ? raw : "/";
}

function back(params: Record<string, string>, next = "/"): never {
  const qs = new URLSearchParams(
    next && next !== "/" ? { ...params, next } : params,
  ).toString();
  redirect(`/login?${qs}`);
}

/** Cloudflare Turnstile token, present when CAPTCHA is enabled (the widget
 *  auto-injects this field into the enclosing form). */
function captcha(formData: FormData): string | undefined {
  const token = String(formData.get("cf-turnstile-response") ?? "");
  return token || undefined;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: captcha(formData) },
  });

  if (error) back({ error: error.message }, next);

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData);
  const origin = (await headers()).get("origin") ?? "";
  // The confirm route already honours `next`; this is what hands it over.
  const confirm = `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirm,
      captchaToken: captcha(formData),
    },
  });

  if (error) back({ error: error.message }, next);
  back({ message: "Check your email to confirm your account." }, next);
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const next = safeNext(formData);
  const origin = (await headers()).get("origin") ?? "";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      captchaToken: captcha(formData),
    },
  });

  if (error) back({ error: error.message }, next);
  back({ message: "Check your email for the magic sign-in link." }, next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
