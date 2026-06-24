import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { jdText } = await request.json();
    if (!jdText || !jdText.trim()) {
      return NextResponse.json({ error: "请粘贴职位描述" }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const systemPrompt =
      "你是一名北美顶级科技与制造大厂的资深技术猎头。你需要对用户输入的 Job Description 进行逆向工程。请以 JSON 格式输出你的分析结果，包含四个字段：\n" +
      "1. `ats_keywords`：(数组) 必须命中的专业名词和硬技能。\n" +
      "2. `core_deliverables`：(数组) 该岗位需要交付的核心业务成果。\n" +
      "3. `soft_skills`：(数组) 隐性要求与团队协作素质。\n" +
      "4. `resume_strategy`：(数组) 给候选人的 3 条极具针对性的简历修改策略。\n" +
      "只返回原生 JSON，不要包含 Markdown 标记。";

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: jdText },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.3,
    });

    // Try to parse JSON from response
    let result;
    try {
      result = JSON.parse(response.content);
    } catch {
      // If response has markdown fences, extract JSON
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        // Fallback: try to find JSON object in the text
        const objMatch = response.content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          result = JSON.parse(objMatch[0]);
        } else {
          throw new Error("无法解析 AI 返回结果");
        }
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "分析失败，请稍后重试";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}