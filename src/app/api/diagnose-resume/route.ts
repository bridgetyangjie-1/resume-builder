import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const SYSTEM_PROMPT = `你是一位拥有顶级商业视角的资深招聘总监。请对这份简历进行全局诊断。

请严格按以下 JSON 格式输出（不要包含任何其他文字，不要 Markdown 标记）：

{
  "weight_analysis": "简述简历的能力侧重点，100字以内",
  "red_flags": [
    {
      "quote": "从简历中复制的一句原文（只复制纯文本内容，不要包含JSON符号或引号）",
      "issue": "这句话的问题，15-30字",
      "suggestion": "改写建议，20-40字"
    }
  ],
  "structural_advice": [
    {
      "quote": "从简历中复制的一段原文（只复制纯文本内容，不要包含JSON符号或引号）",
      "issue": "这段经历的结构问题，15-30字",
      "suggestion": "结构调整建议，25-50字"
    }
  ]
}

重要要求：
- quote 字段只能包含简历中的纯文本内容（如"负责产品规划"），绝对不能包含JSON符号（如引号、冒号、花括号等）
- red_flags 提供 2-3 条，引用简历中写得不好的原文
- structural_advice 提供 2-3 条，引用需要调整的原文
- 语言犀利直接，不要客套
- 只输出 JSON，不要任何解释`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resume } = body;

    if (!resume) {
      return NextResponse.json({ error: '请提供简历数据' }, { status: 400 });
    }

    // Convert resume to readable text format for the AI
    const resumeText = formatResumeForAI(resume);

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: resumeText },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.3,
    });

    const content = response.content.trim();

    // Remove markdown code block if present
    let jsonStr = content;
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    // Extract JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '诊断失败，请重试';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function formatResumeForAI(resume: Record<string, unknown>): string {
  const lines: string[] = [];
  
  if (resume.name) lines.push(`姓名：${resume.name}`);
  if (resume.position) lines.push(`求职岗位：${resume.position}`);
  
  if (Array.isArray(resume.workExperience) && resume.workExperience.length > 0) {
    lines.push('\n【工作经历】');
    for (const work of resume.workExperience as Record<string, unknown>[]) {
      const company = work.company || '';
      const title = work.title || '';
      const period = work.startDate && work.endDate ? `${work.startDate} ~ ${work.endDate}` : '';
      const desc = work.description || '';
      lines.push(`- ${company} | ${title} | ${period}`);
      if (desc) lines.push(`  工作内容：${desc}`);
    }
  }
  
  if (Array.isArray(resume.education) && resume.education.length > 0) {
    lines.push('\n【教育经历】');
    for (const edu of resume.education as Record<string, unknown>[]) {
      const school = edu.school || '';
      const major = edu.major || '';
      const degree = edu.degree || '';
      const period = edu.startDate && edu.endDate ? `${edu.startDate} ~ ${edu.endDate}` : '';
      lines.push(`- ${school} | ${major} | ${degree} | ${period}`);
    }
  }
  
  if (resume.skills) {
    lines.push(`\n【核心技能】${resume.skills}`);
  }
  
  return lines.join('\n');
}
