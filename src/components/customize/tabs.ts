/** Customizer tabs. Plain module so both the server page and the client studio can read it. */
export const TABS = [
  { id: "theme", label: "Theme" },
  { id: "name", label: "Name & bio" },
  { id: "buttons", label: "Buttons & layout" },
  { id: "frame", label: "Frame" },
  { id: "about", label: "About board" },
  { id: "css", label: "CSS" },
] as const;

export type TabId = (typeof TABS)[number]["id"];
