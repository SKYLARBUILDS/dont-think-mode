import { NextRequest, NextResponse } from "next/server";
import { originDenied, rateLimited } from "@/lib/apiGuard";

export const runtime = "edge";

const MAX_TITLES = 50;
const MAX_TITLE_LEN = 300;
const MAX_GOALS = 30;

interface Body {
  titles: string[];
  goals: { title: string; tier: string; weight: number }[];
  key: string;
}

const SYSTEM = `你是一位创始人的私人执行教练，帮助 TA 排序今天的任务。
评估每个任务：是否推进产品、是否带来收入或融资、是否带来客户、是否紧急、是否重要、是否影响健康与状态、是否可推迟。
结合用户的长期目标权重排序。最重要的放第一。
只输出 JSON，不要解释性文字。`;

export async function POST(req: NextRequest) {
  const denied = originDenied(req) ?? rateLimited(req);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const { titles, goals, key } = body;
  if (!key || !Array.isArray(titles) || titles.length === 0) {
    return NextResponse.json({ error: "missing key or titles" }, { status: 400 });
  }
  if (titles.length > MAX_TITLES || titles.some((t) => String(t).length > MAX_TITLE_LEN)) {
    return NextResponse.json({ error: "too many / too long titles" }, { status: 413 });
  }

  const goalText = (Array.isArray(goals) ? goals.slice(0, MAX_GOALS) : [])
    .map((g) => `- ${g.title} (${g.tier}, 权重${g.weight})`)
    .join("\n");

  const prompt = `长期目标：
${goalText}

今天想做的事：
${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

请返回 JSON，结构：
{"tasks":[{"title":string,"rank":number,"pomodoros":number(1-4),"reason":string(为什么这样排序，简短中文),"deep":boolean,"morning":boolean,"revenue":boolean,"product":boolean,"health":boolean,"optional":boolean}]}
rank 从 1 开始，1 最重要。pomodoros 是每个 25 分钟专注块的数量。`;

  // Google Gemini keys start with "AIza"; everything else → OpenAI.
  const isGemini = key.startsWith("AIza");

  try {
    let content: string;

    if (isGemini) {
      const model = "gemini-2.5-flash";
      // Key travels in a header, not the URL — query strings end up in
      // upstream access logs.
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        return NextResponse.json({ error: `gemini ${res.status}: ${txt}` }, { status: 502 });
      }
      const data = await res.json();
      content =
        data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
        "{}";
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return NextResponse.json({ error: `openai ${res.status}: ${txt}` }, { status: 502 });
      }
      const data = await res.json();
      content = data.choices?.[0]?.message?.content ?? "{}";
    }

    const parsed = JSON.parse(content);
    const raw = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    // Coerce defensively — the LLM's JSON is untrusted (NaN ranks would make
    // the sort below unstable).
    const num = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const tasks = raw.slice(0, MAX_TITLES).map((t: any, i: number) => ({
      id: `t${Date.now()}_${i}`,
      title: String(t.title ?? titles[i] ?? "任务").slice(0, MAX_TITLE_LEN),
      rank: num(t.rank, i + 1),
      pomodoros: Math.max(1, Math.min(4, num(t.pomodoros, 2))),
      reason: String(t.reason ?? ""),
      deep: !!t.deep,
      morning: !!t.morning,
      revenue: !!t.revenue,
      product: !!t.product,
      health: !!t.health,
      optional: !!t.optional,
      done: false,
      donePomodoros: 0,
    }));

    tasks.sort((a: any, b: any) => a.rank - b.rank);
    tasks.forEach((t: any, i: number) => (t.rank = i + 1));

    return NextResponse.json({ tasks });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
