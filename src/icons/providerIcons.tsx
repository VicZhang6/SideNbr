import type { ReactNode } from "react";
import type { ProviderId } from "../providers";
import {
  DeepSeekIcon,
  GrokIcon,
  OpenAIIcon,
  PerplexityIcon,
} from "./BrandIcons";

export function ProviderBrandIcon({
  id,
  size = 16,
}: {
  id: ProviderId;
  size?: number;
}): ReactNode {
  switch (id) {
    case "perplexity":
      return <PerplexityIcon size={size} title="Perplexity" />;
    case "chatgpt":
      return (
        <OpenAIIcon size={size} title="ChatGPT" style={{ color: "#10a37f" }} />
      );
    case "deepseek":
      return <DeepSeekIcon size={size} title="DeepSeek" />;
    case "grok":
      return <GrokIcon size={size} title="Grok" style={{ color: "#111111" }} />;
    default:
      return null;
  }
}
