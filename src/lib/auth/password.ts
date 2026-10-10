export const PASSWORD_MIN = 8;

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

/** Strength told as the stages of a drawing — still shown as text, never color alone. */
export const STRENGTH_STAGES: Record<PasswordStrength, string> = {
  0: "Blank page",
  1: "Rough sketch",
  2: "Line art",
  3: "Flats",
  4: "Fully rendered",
};

const COMMON = ["password", "12345678", "123456789", "qwerty", "iloveyou", "artiflow", "letmein", "11111111"];

/**
 * A quick, honest estimate — length first, then variety. Under the minimum
 * it's always a rough sketch; well-known passwords never get past one.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  if (password.length < PASSWORD_MIN) return 1;
  if (COMMON.some((word) => password.toLowerCase().includes(word))) return 1;

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  let score = 2;
  if (password.length >= 12 || kinds >= 3) score++;
  if ((password.length >= 12 && kinds >= 3) || password.length >= 16) score++;
  return score as PasswordStrength;
}
