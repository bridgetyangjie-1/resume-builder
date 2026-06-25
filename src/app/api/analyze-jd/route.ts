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

    const systemPrompt = `你是一名顶级的资深技术猎头与 ATS（候选人追踪系统）破译专家。请将用户输入的 Job Description (JD) 进行深度逆向拆解。
你的分析必须跳出"简单总结"，而是为候选人提炼出可以直接指导简历修改的通关密码。

请严格以纯 JSON 格式输出，不要包含任何 Markdown 标记（如 \`\`\`json），不要有任何解释性文字。JSON 结构如下：
{
  "core_deliverables": ["核心痛点或产出1", "核心痛点或产出2"],
  "ats_keywords": ["关键词1", "关键词2"],
  "soft_traits": ["软素质1", "软素质2"],
  "ideal_candidate": "一句话浓缩理想候选人画像，30字以内",
  "resume_action_plan": ["策略1", "策略2"]
}

字段说明：
- core_deliverables：提炼该岗位必须解决的 3-4 个核心业务痛点或产出成果。不要罗列日常动作。
- ats_keywords：提取 8-15 个必须高频出现的硬性技能、专业术语与工具。
- soft_traits：提炼 3-5 个体现团队协作、跨部门沟通或抗压能力的特质，极简短语。
- ideal_candidate：一句话浓缩理想候选人画像，30字以内。
- resume_action_plan：给出 3 条用于修改简历的具体行动策略。

要求：语言极度精炼、犀利，直击要害。`;

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
  } catch (error) {
    console.error("JD analyze error:", error);
    return NextResponse.json({ error: "JD 解析失败，请重试" }, { status: 500 });
  }
}
