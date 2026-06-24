import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { text, jdContext } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "请提供要优化的文本" }, { status: 400 });
    }

    let systemPrompt =
      "你是一名资深简历优化专家。请对用户提供的工作经历描述进行润色，要求：\n" +
      "1. 使用强动词开头（如 Delivered、Led、Designed、Implemented、Optimized）\n" +
      "2. 量化成果，使用具体数字和百分比\n" +
      "3. 保持专业、简洁、有冲击力的语言风格\n" +
      "4. 直接输出润色后的文本，不要添加解释或前缀";

    if (jdContext) {
      systemPrompt +=
        "\n\n请重点确保这段经历中体现出以下 ATS 关键词：" +
        (jdContext.ats_keywords?.join("、") || "无") +
        "，并证明具备交付 " +
        (jdContext.core_deliverables?.join("、") || "相关成果") +
        " 的能力。同时注意展现以下软素质：" +
        (jdContext.soft_skills?.join("、") || "无") +
        "。";
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: text },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.4,
    });

    return NextResponse.json({ success: true, data: response.content });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "润色失败，请稍后重试";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}