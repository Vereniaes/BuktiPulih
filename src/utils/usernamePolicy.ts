// Keep username spelling and allow any character except whitespace.
export const USERNAME_PATTERN = /^\S{1,24}$/u;
export const USERNAME_HINT = {
  id: "1-24 karakter, tanpa spasi.",
  en: "1-24 characters, no spaces.",
};
