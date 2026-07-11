import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export type ParsedContract = {
  vendor: string;
  renewalDate: string; // ISO date
  noticePeriodDays: number;
  cost: number | null;
};

const TOOL_NAME = "extract_contract";

export async function parseContractText(rawText: string): Promise<ParsedContract> {
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY missing — contract parsing disabled");
  }

  const today = new Date().toISOString().slice(0, 10);

  const message = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 400,
    system: `You extract structured renewal data from pasted contract/vendor text. Today's date is ${today}. If a renewal date isn't stated explicitly but a term length is (e.g. "12-month term starting Jan 1 2026"), compute it. If notice period isn't stated, default to 30. If cost isn't stated, use null.`,
    messages: [{ role: "user", content: rawText.slice(0, 6000) }],
    tools: [
      {
        name: TOOL_NAME,
        description: "Record extracted contract renewal fields",
        input_schema: {
          type: "object",
          properties: {
            vendor: { type: "string", description: "Vendor or counterparty name" },
            renewalDate: { type: "string", description: "ISO date YYYY-MM-DD of next renewal/expiry" },
            noticePeriodDays: { type: "integer", description: "Days of advance notice required to cancel" },
            cost: { type: ["number", "null"], description: "Contract cost/value if stated, else null" },
          },
          required: ["vendor", "renewalDate", "noticePeriodDays"],
        },
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return structured contract data");
  }

  const input = toolUse.input as Partial<ParsedContract>;
  if (!input.vendor || !input.renewalDate) {
    throw new Error("Could not extract vendor/renewal date from this text");
  }

  return {
    vendor: input.vendor,
    renewalDate: input.renewalDate,
    noticePeriodDays: input.noticePeriodDays ?? 30,
    cost: input.cost ?? null,
  };
}
