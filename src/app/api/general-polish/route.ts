import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "请输入工作内容" }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一名拥有15年经验的五百强企业资深 HR 专家。请对用户提供的单条工作经历进行通用的专业化润色，以协助用户建立一份高质量的"基线简历"。

要求：
1. 采用 STAR 法则（情境、任务、行动、结果）重构句子结构。
2. 剔除所有主观形容词，强制以强有力的"动作动词"（如：主导、重构、搭建、优化）开头。
3. 如果原句中有数据，请将其前置或凸显，增强商业和业务价值感。
4. 语言极致精炼，剔除一切冗余的连接词。
5. 格式要求：如果润色后内容较长，请自动拆分为 1-3 个精炼的 Bullet Points（项目符号用 •）。

请直接返回润色后的纯文本内容，绝对不要包含任何前缀、客套话、解释或 Markdown 代码块标记。`;

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
    console.error("General polish error:", error);
    return NextResponse.json({ error: "润色失败，请重试" }, { status: 500 });
  }
}
