// Keep the password format check consistent across account forms.
export const PASSWORD_FORMAT = /^\S{8,128}$/u;
export const matchesPasswordFormat = (value: string) => PASSWORD_FORMAT.test(value.normalize("NFC"));
