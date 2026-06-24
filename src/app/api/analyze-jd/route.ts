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
      "你是一名资深技术猎头。请将用户输入的 JD 拆解为结构化信息，以 JSON 格式返回，只包含以下 5 个字段：\n" +
      "1. `responsibilities`：(字符串数组) 岗位的核心职责，每句 10-20 字，简洁扼要\n" +
      "2. `hard_requirements`：(字符串数组) 硬性要求 — 必须掌握的技能、工具、经验，每项 5-15 字\n" +
      "3. `soft_requirements`：(字符串数组) 隐性要求 — 软素质、团队协作等，每项 5-15 字\n" +
      "4. `ideal_candidate`：(字符串) 一句话浓缩理想候选人画像，30 字以内\n" +
      "5. `keywords`：(字符串数组) 核心关键词标签，用作简历投递时的必含词汇，8-15 个\n" +
      "要求：每条内容都要简短精炼，不要长篇大论。只返回原生 JSON，不要 Markdown。";

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: jdText },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.3,
    });

    let result;
    try {
      result = JSON.parse(response.content);
    } catch {
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
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