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
        "\n\n请参考以下 JD 逆向拆解结果进行针对性优化：\n" +
        "1. 简历中必须高频出现这些 ATS 关键词：" + (jdContext.ats_keywords?.join("、") || "无") + "\n" +
        "2. 强调具备交付这些核心成果的能力：" + (jdContext.core_deliverables?.join("、") || "相关成果") + "\n" +
        "3. 侧面展现这些软素质：" + (jdContext.soft_traits?.join("、") || "无") + "\n" +
        "4. 匹配候选人画像：" + (jdContext.ideal_candidate || "相关岗位") + "\n" +
        "5. 严格遵循以下简历修改指令：" + (jdContext.resume_action_plan?.join("；") || "无");
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