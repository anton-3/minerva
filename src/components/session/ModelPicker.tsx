// ModelPicker — dropdown to select AI model
// Allows switching between Claude Sonnet, Claude Haiku, Gemini 3 Pro, and Gemini 3 Flash.
// Selection persists to localStorage via Zustand persist middleware.

"use client";

import { useSessionStore } from "@/stores/sessionStore";
import { AI_MODELS, type AIModelId } from "@/types/session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelPickerProps {
  className?: string;
}

export function ModelPicker({ className }: ModelPickerProps) {
  const selectedModel = useSessionStore((s) => s.selectedModel);
  const setSelectedModel = useSessionStore((s) => s.setSelectedModel);

  // Find the current model config for display
  const currentModel = AI_MODELS.find((m) => m.id === selectedModel);

  return (
    <Select
      value={selectedModel}
      onValueChange={(v) => setSelectedModel(v as AIModelId)}
    >
      <SelectTrigger size="sm" className={className}>
        <SelectValue>
          {currentModel?.displayName ?? "Select Model"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {AI_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <span className="flex items-center gap-2">
              {model.provider === "anthropic" ? (
                <span className="text-orange-500 text-xs font-medium">A</span>
              ) : model.provider === "google" ? (
                <span className="text-blue-500 text-xs font-medium">G</span>
              ) : (
                <span className="text-green-500 text-xs font-medium">O</span>
              )}
              {model.displayName}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
