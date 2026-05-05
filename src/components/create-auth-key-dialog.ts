export interface AuthKeyDialogUserOption {
  id: string;
  label: string;
}

export interface AuthKeyDialogDefaults {
  user: string;
  reusable: boolean;
  ephemeral: boolean;
  expiration: string;
  aclTags: string;
}

export type AuthKeyDialogPayload = AuthKeyDialogDefaults;

export interface AuthKeyDialogLabels {
  title: string;
  description: string;
  owner: string;
  expiration: string;
  aclTags: string;
  reusable: string;
  ephemeral: string;
  cancel: string;
  submit: string;
  noUsers: string;
  time: string;
  hour: string;
  minute: string;
}

export function isoToDateTimeLocal(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function dateTimeLocalToIso(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}
