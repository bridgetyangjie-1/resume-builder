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

请以原生 JSON 格式返回结果（绝对不要包含 \`\`\`json 等 Markdown 标记，直接输出大括号），只包含以下 5 个字段：

1. \`core_deliverables\`：(字符串数组) 核心业务交付物。不要罗列日常动作，而是提炼该岗位必须解决的 3-4 个核心业务痛点或产出成果（例如："从0到1搭建数据平台"），每项 10-20 字。
2. \`ats_keywords\`：(字符串数组) 简历中必须高频出现的硬性技能、专业术语与工具。提取 8-15 个核心词汇，用于直接对抗机器筛选。
3. \`soft_traits\`：(字符串数组) 隐性红线与软素质。提炼 3-5 个体现团队协作、跨部门沟通或抗压能力的特质，每项 5-15 字。
4. \`ideal_candidate\`：(字符串) 理想候选人画像。用一句话浓缩，让用户一眼看出"招人方到底在找一个什么样的人"，30 字以内。
5. \`resume_action_plan\`：(字符串数组) 专属简历修改指令。基于上述分析，直接给出 3 条用于修改简历的行动策略（例如："在工作经历中必须量化跨部门协同缩短的交付周期"），每条 15-30 字。

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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "分析失败，请稍后重试";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}