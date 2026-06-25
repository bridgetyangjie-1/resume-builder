import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const SYSTEM_PROMPT = `你是一位拥有顶级商业视角的资深招聘总监 (Hiring Manager)。用户正在向你展示他/她的完整简历草稿。请跳出词句的微观修改，从宏观的职业叙事、权重分配和商业价值展现上进行残酷但极具建设性的全局诊断。

请以 JSON 格式输出你的分析，包含三个字段：
1. \`weight_analysis\` (字符串): 简述整份简历呈现出的能力侧重点（如偏向执行 vs 偏向战略），指出是否符合资深职场人的预期，100字以内。
2. \`red_flags\` (字符串数组): 找出 2-3 个结构性问题，如某段经历流水账严重、管理与执行的比例失调、缺乏量化指标等，每条 15-30 字。
3. \`structural_advice\` (字符串数组): 给出 3 条关于如何调整段落比例、合并同类项或删减无关信息的全局建议，每条 15-30 字。

语言犀利直接，不要客套。只返回原生 JSON，不要 Markdown 标记。`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resume } = body;

    if (!resume) {
      return NextResponse.json({ error: '请提供简历数据' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: JSON.stringify(resume) },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.5,
    });

    const content = response.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 返回格式异常' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '诊断失败，请重试';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
