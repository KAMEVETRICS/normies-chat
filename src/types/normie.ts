export interface NormieTraits {
  Type: "Human" | "Cat" | "Alien" | "Agent";
  Gender: "Male" | "Female" | "Non-Binary";
  Age: "Young" | "Middle-Aged" | "Old";
  "Hair Style": string;
  "Facial Feature": string;
  Eyes: string;
  Expression: string;
  Accessory: string;
}

export interface CanvasInfo {
  actionPoints: number;
  level: number;
  customized: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
