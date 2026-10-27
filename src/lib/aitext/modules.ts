// Module registry — content-type templates. Extensible.
export type ModuleId = "blog" | "social" | "product" | "news" | "profile";

export type ModuleDef = {
  id: ModuleId;
  label: string;
  description: string;
  defaults: {
    imageMin: number;
    imageMax: number;
    descMin: number;
    descMax: number;
    paragraphs: number;
    contentRules: string;
  };
};

export const MODULES: ModuleDef[] = [
  {
    id: "blog",
    label: "Blog",
    description: "Long-form editorial style content.",
    defaults: {
      imageMin: 14, imageMax: 18, descMin: 120, descMax: 160, paragraphs: 3,
      contentRules: "Paragraph 1 introduces the topic. Paragraph 2 explores key points. Paragraph 3 wraps with insight or impact.",
    },
  },
  {
    id: "social",
    label: "Social",
    description: "Short, punchy social-media post style.",
    defaults: {
      imageMin: 12, imageMax: 16, descMin: 80, descMax: 110, paragraphs: 3,
      contentRules: "Paragraph 1 hooks with the subject. Paragraph 2 expands the moment. Paragraph 3 closes with significance.",
    },
  },
  {
    id: "product",
    label: "Product",
    description: "Product feature/benefit description.",
    defaults: {
      imageMin: 12, imageMax: 16, descMin: 90, descMax: 120, paragraphs: 3,
      contentRules: "Paragraph 1 names the product and core promise. Paragraph 2 lists distinguishing features. Paragraph 3 explains the buyer benefit.",
    },
  },
  {
    id: "news",
    label: "News",
    description: "Factual news brief.",
    defaults: {
      imageMin: 14, imageMax: 18, descMin: 95, descMax: 130, paragraphs: 3,
      contentRules: "Paragraph 1 states who/what/when. Paragraph 2 adds context. Paragraph 3 covers impact or next steps.",
    },
  },
  {
    id: "profile",
    label: "Profile",
    description: "Person/artist profile bio.",
    defaults: {
      imageMin: 14, imageMax: 18, descMin: 95, descMax: 130, paragraphs: 3,
      contentRules: "Paragraph 1 starts with the subject. Paragraph 2 covers role/career. Paragraph 3 covers achievements.",
    },
  },
];

export function getModule(id: ModuleId | null | undefined): ModuleDef | null {
  return MODULES.find(m => m.id === id) || null;
}
