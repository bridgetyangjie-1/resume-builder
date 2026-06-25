import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { resume } = await request.json();
    if (!resume) {
      return NextResponse.json({ error: "简历数据为空" }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // Format resume as human-readable text for AI
    const formatResumeForAI = (r: Record<string, unknown>): string => {
      const lines: string[] = [];
      if (r.name) lines.push(`姓名：${r.name}`);
      if (r.position) lines.push(`求职意向：${r.position}`);
      if (r.email) lines.push(`邮箱：${r.email}`);
      if (r.phone) lines.push(`电话：${r.phone}`);
      if (r.website) lines.push(`网站：${r.website}`);
      lines.push("");

      const workExp = r.workExperience as Array<Record<string, string>> | undefined;
      if (workExp && workExp.length > 0) {
        lines.push("【工作经历】");
        workExp.forEach((w, i) => {
          lines.push(`经历${i + 1}：${w.company || ""} | ${w.title || ""} | ${w.startDate || ""} ~ ${w.endDate || ""}`);
          if (w.description) lines.push(`工作内容：${w.description}`);
          lines.push("");
        });
      }

      const education = r.education as Array<Record<string, string>> | undefined;
      if (education && education.length > 0) {
        lines.push("【教育经历】");
        education.forEach((e, i) => {
          lines.push(`经历${i + 1}：${e.school || ""} | ${e.major || ""} | ${e.degree || ""} | ${e.startDate || ""} ~ ${e.endDate || ""}`);
          lines.push("");
        });
      }

      if (r.skills) lines.push(`【核心技能】${r.skills}`);

      return lines.join("\n");
    };

    const resumeText = formatResumeForAI(resume);

    const systemPrompt = `你是一位拥有顶级商业视角的资深招聘总监。请对这份简历进行全局诊断。

请严格按以下 JSON 格式输出（不要包含任何其他文字，不要 Markdown 标记）：

{
  "weight_analysis": "简述简历的能力侧重点，100字以内",
  "red_flags": [
    {
      "quote": "从简历中复制的一句原文（请妥善使用反斜杠转义原文中的双引号，以保证 JSON 合法性）",
      "issue": "这句话的问题，15-30字",
      "suggestion": "改写建议：先说明问题原因（10字），再给出具体的改写骨架示例（50-80字）。必须使用 [具体数值] 或 [XX]% 作为数据占位符，绝不可捏造虚假数据。"
    }
  ],
  "structural_advice": [
    {
      "quote": "从简历中复制的一段原文（妥善转义）",
      "issue": "这段经历的结构问题，15-30字",
      "suggestion": "结构调整建议：先说明调整方向（10字），再给出具体的 STAR 结构骨架示例（80-120字）。同样只能使用 [占位符] 表示尚未提供的量化成果。"
    }
  ]
}

重要要求：
- quote 字段只能包含简历中的纯文本内容，请妥善转义引号以保证 JSON 合法
- red_flags 提供 2-3 条，引用简历中写得不好的原文
- structural_advice 提供 2-3 条，引用需要调整的原文
- suggestion 字段必须包含具体的改写骨架示例，不能只说"建议量化"或"建议补充数据"
- 示例中要包含动作动词（如"主导"、"重构"、"优化"）和业务价值（如"降低成本"、"提升效率"）
- **严禁编造具体数字**，用 [占位符] 提示用户补充
- 语言犀利直接，不要客套
- 只输出 JSON，不要任何解释`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `以下是简历内容：\n\n${resumeText}` },
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
    console.error("Resume diagnose error:", error);
    return NextResponse.json({ error: "简历诊断失败，请重试" }, { status: 500 });
  }
}
