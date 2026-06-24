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
      "你是一名北美顶级科技与制造大厂的资深技术猎头。你需要对用户输入的 Job Description 进行逆向工程。" +
      "请深入分析这份 JD 到底在找什么样的人。请以 JSON 格式输出你的分析结果，包含以下六个字段：\n" +
      "1. `target_profile`：(对象) 候选人画像，包含：\n" +
      "   - `industry_background`：(数组) 要求候选人来自哪些行业/领域经验（如互联网、汽车、消费电子等）\n" +
      "   - `past_roles`：(数组) 候选人过往应该担任过哪些职位/角色\n" +
      "   - `experience_keywords`：(数组) 候选人简历中必须体现的关键经历类型（如\"从0到1搭建团队\"、\"跨国项目管理\"、\"数据驱动决策\"等）\n" +
      "   - `years_experience`：(字符串) 要求的经验年限范围\n" +
      "   - `education_preference`：(字符串) 学历/专业偏好\n" +
      "2. `ats_keywords`：(数组) 必须命中的专业名词和硬技能，按照重要度从高到低排序，前 30% 为最关键\n" +
      "3. `core_deliverables`：(数组) 该岗位需要交付的核心业务成果，不要照抄原句，要总结出\"这个岗位到底要解决什么问题\"\n" +
      "4. `soft_skills`：(数组) 隐性要求与团队协作素质，如沟通风格、跨部门协作、抗压能力等\n" +
      "5. `requirements_tiers`：(对象) 硬性门槛与加分项，包含：\n" +
      "   - `must_have`：(数组) 硬性必备条件（如必须拥有的技能、经验年限下限等）\n" +
      "   - `nice_to_have`：(数组) 加分项/优先条件\n" +
      "6. `resume_strategy`：(数组) 给候选人的 3-5 条极具针对性的简历修改策略，每条都要具体可操作\n" +
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