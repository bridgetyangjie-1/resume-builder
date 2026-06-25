import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { text, jdContext } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "请输入工作内容" }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    let systemPrompt = `你是一名资深简历优化专家。请对用户提供的工作经历描述进行润色，要求：
1. 使用强动词开头（如 Delivered、Led、Designed、Implemented、Optimized）
2. 量化成果，使用具体数字和百分比
3. 保持专业、简洁、有冲击力的语言风格
4. 直接输出润色后的文本，不要添加解释或前缀`;

    // If JD context is available, inject it into the prompt
    if (jdContext) {
      const keywords = jdContext.ats_keywords?.join("、") || "";
      const deliverables = jdContext.core_deliverables?.join("、") || "";
      const softTraits = jdContext.soft_traits?.join("、") || "";
      const idealCandidate = jdContext.ideal_candidate || "";
      const actionPlan = jdContext.resume_action_plan?.join("；") || "";

      systemPrompt += `

请参考以下 JD 逆向拆解结果进行针对性优化：
1. 简历中必须高频出现这些 ATS 关键词：${keywords}
2. 强调具备交付这些核心成果的能力：${deliverables}
3. 侧面展现这些软素质：${softTraits}
4. 匹配候选人画像：${idealCandidate}
5. 严格遵循以下简历修改指令：${actionPlan}

注意：不要生硬堆砌关键词，要自然融入工作经历描述中。`;
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: text },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.5,
    });

    return NextResponse.json({ success: true, data: response.content });
  } catch (error) {
    console.error("Optimize resume error:", error);
    return NextResponse.json({ error: "优化失败，请重试" }, { status: 500 });
  }
}
