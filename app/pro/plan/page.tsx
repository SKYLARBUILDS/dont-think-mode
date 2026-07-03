"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLife } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { packTasksIntoWork } from "@/lib/schedule";
import { fmtClock } from "@/lib/time";
import { parseTasks, sortTasks } from "@/lib/ai";
import { API_BASE } from "@/lib/apiBase";
import TaskRing from "@/components/pro/TaskRing";

const EXAMPLE = "今天想做：给潜在用户发消息，写落地页第一版，录一条产品 demo。";

export default function ProPlanPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const tasks = useLife((s) => s.tasks);
  const goals = useLife((s) => s.goals);
  const settings = useLife((s) => s.settings);
  const openaiKey = useLife((s) => s.settings.openaiKey);
  const aiSource = useLife((s) => s.aiSource);
  const planConfirmed = useLife((s) => s.planConfirmed);
  const appendTasks = useLife((s) => s.appendTasks);
  const clearTasks = useLife((s) => s.clearTasks);
  const setTaskRank = useLife((s) => s.setTaskRank);
  const toggleOptional = useLife((s) => s.toggleTaskOptional);
  const toggleDone = useLife((s) => s.toggleTaskDone);
  const addTask = useLife((s) => s.addTask);
  const removeTask = useLife((s) => s.removeTask);
  const editTaskTitle = useLife((s) => s.editTaskTitle);
  const setTaskPomodoros = useLife((s) => s.setTaskPomodoros);
  const setTaskProgress = useLife((s) => s.setTaskProgress);
  const toggleRecurring = useLife((s) => s.toggleTaskRecurring);
  const confirmPlan = useLife((s) => s.confirmPlan);
  const blocks = useLife((s) => s.schedule);

  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const parsed = parseTasks(text);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newTask, setNewTask] = useState("");

  function startEdit(id: string, title: string) {
    setEditingId(id);
    setDraft(title);
  }
  function commitEdit() {
    if (editingId) editTaskTitle(editingId, draft);
    setEditingId(null);
    setDraft("");
  }
  function commitNewTask() {
    if (newTask.trim()) {
      addTask(newTask);
      setNewTask("");
    }
  }

  const ordered = useMemo(
    () => [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.rank - b.rank),
    [tasks]
  );
  const slots = useMemo(
    () =>
      packTasksIntoWork(
        ordered.filter((t) => !t.optional),
        blocks,
        settings.focusLength,
        settings.breakLength
      ),
    [ordered, blocks, settings.focusLength, settings.breakLength]
  );

  const micActive = listening || recording || transcribing;

  function handleMic() {
    if (transcribing) return;
    if (openaiKey.startsWith("AIza")) {
      recording ? stopRecording() : startRecording();
    } else {
      toggleWebSpeech();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ["audio/mp4", "audio/webm", "audio/aac", "audio/ogg"];
      const mimeType =
        types.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/mp4" });
        await transcribe(blob, mr.mimeType || "audio/mp4");
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      alert("无法访问麦克风。请在弹出的权限提示里允许使用麦克风。");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    setTranscribing(true);
  }

  async function transcribe(blob: Blob, mimeType: string) {
    try {
      const buf = await blob.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const base64 = btoa(bin);
      const res = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, mimeType, key: openaiKey }),
      });
      const data = await res.json();
      if (data.text) {
        setText((prev) => (prev ? prev.trim() + " " : "") + data.text);
      } else {
        alert("没听清，再说一遍试试。");
      }
    } catch {
      alert("转写失败，请检查网络或 Settings 里的 key。");
    } finally {
      setTranscribing(false);
    }
  }

  function toggleWebSpeech() {
    const SR =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      alert(
        "此设备的浏览器不支持实时语音。请在 Settings 里填入 Gemini（AIza…）key，即可用录音转文字；或直接用键盘的听写。"
      );
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = true;
    rec.continuous = true;
    let base = text ? text + " " : "";
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) base += final;
      setText(base + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function organize() {
    if (parsed.length === 0) return;
    setBusy(true);
    const { tasks: sorted, source } = await sortTasks(parsed, goals, openaiKey);
    appendTasks(sorted, source);
    setBusy(false);
    setText("");
  }

  if (!hydrated)
    return (
      <div className="flex min-h-dvh items-center justify-center text-lux-faint">…</div>
    );

  const totalPomodoros = ordered
    .filter((t) => !t.optional)
    .reduce((n, t) => n + t.pomodoros, 0);
  const doneCount = ordered.filter((t) => t.done).length;
  const activeCount = ordered.filter((t) => !t.optional).length;

  return (
    <div className="pb-32 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight text-lux-text">今日计划 ✍️</h1>
        <p className="mt-1 text-sm text-lux-faint">说出来，或写下来。AI 会结合你的目标排序。</p>
      </header>

      {/* input */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          rows={4}
          className="w-full resize-none rounded-[24px] bg-white p-4 text-[15px] leading-relaxed text-lux-text shadow-[var(--lux-shadow)] placeholder:text-lux-faint focus:outline-none focus:ring-2 focus:ring-lux-sage/40"
        />
        <button
          onClick={handleMic}
          disabled={transcribing}
          aria-label="语音输入"
          className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
            micActive
              ? "animate-breathe border-lux-sage bg-lux-sage/20 text-lux-sage"
              : "border-lux-line/70 bg-lux-card/60 text-lux-dim"
          }`}
        >
          <span className="text-lg">
            {transcribing ? "…" : listening || recording ? "■" : "🎙"}
          </span>
        </button>
      </div>

      {(listening || recording) && (
        <p className="mt-2 text-center text-xs text-lux-sage">正在录音… 说完点 ■ 停止</p>
      )}
      {transcribing && <p className="mt-2 text-center text-xs text-lux-faint">转写中…</p>}

      {parsed.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-lux-faint">
            识别到 {parsed.length} 个任务
          </p>
          <ul className="space-y-2">
            {parsed.map((t, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-lux-line/70 bg-lux-card/50 px-3 py-2.5 text-sm text-lux-text backdrop-blur-md"
              >
                <span className="numeric text-lux-faint">{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={organize}
        disabled={parsed.length === 0 || busy}
        className="mt-4 w-full rounded-2xl py-3.5 text-sm font-semibold text-lux-bg shadow-[var(--lux-shadow)] transition-opacity disabled:opacity-30"
        style={{ backgroundImage: "var(--grad-violet)" }}
      >
        {busy ? "AI 排序中…" : tasks.length > 0 ? "AI 整理并加入计划 →" : "AI 整理并排序 →"}
      </button>

      {!openaiKey && parsed.length > 0 && (
        <p className="mt-3 text-center text-xs text-lux-faint">
          未配置 OpenAI Key — 使用本地智能排序。可在 Settings 添加 Key 启用 GPT。
        </p>
      )}

      {tasks.length === 0 && parsed.length === 0 && (
        <button
          onClick={() => setText(EXAMPLE)}
          className="mt-4 w-full text-center text-xs text-lux-faint"
        >
          用示例填充
        </button>
      )}

      {/* sorted plan */}
      {tasks.length > 0 && (
        <>
          <div className="my-7 h-px bg-lux-line/60" />
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-widest text-lux-faint">
              {aiSource === "ai" ? "GPT 已结合你的目标排序" : "本地智能排序（结合目标权重）"}
            </p>
            <div className="flex items-center gap-3">
              <p className="numeric text-xs text-lux-faint">
                完成 {doneCount}/{activeCount} · {totalPomodoros} 🍅
              </p>
              <button
                onClick={() => {
                  if (confirm("清空今天全部任务？此操作无法撤销。")) clearTasks();
                }}
                className="text-[11px] text-lux-faint"
              >
                清空全部
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {ordered.map((t, i) => (
              <div
                key={t.id}
                className={`rounded-[24px] bg-white p-4 shadow-[var(--lux-shadow)] transition-opacity ${
                  t.optional || t.done ? "opacity-55" : ""
                } ${i < 3 && !t.optional && !t.done ? "ring-2 ring-lux-sage/30" : ""}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  {t.done ? (
                    <button onClick={() => toggleDone(t.id)} className="mt-0.5 shrink-0">
                      <TaskRing done={t.pomodoros} total={t.pomodoros} size={28} stroke={3} />
                    </button>
                  ) : (
                    <div className="relative mt-0.5 h-7 w-7 shrink-0">
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full border border-lux-line/70 bg-lux-card text-xs font-semibold text-lux-dim">
                        {t.rank}
                      </span>
                      <select
                        value={t.rank}
                        onChange={(e) => setTaskRank(t.id, Number(e.target.value))}
                        aria-label="优先级序号 · 改成几就排第几"
                        className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
                      >
                        {Array.from({ length: tasks.length }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {editingId === t.id ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setDraft("");
                          }
                        }}
                        className="w-full rounded-lg border border-lux-sage/50 bg-lux-card px-2 py-1 text-[15px] font-medium text-lux-text focus:outline-none"
                      />
                    ) : (
                      <p
                        onClick={() => startEdit(t.id, t.title)}
                        className={`cursor-text font-medium text-lux-text ${
                          t.optional || t.done ? "line-through" : ""
                        }`}
                      >
                        {t.title}
                      </p>
                    )}
                    {t.reason && (
                      <p className="mt-0.5 text-xs leading-relaxed text-lux-faint">{t.reason}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <div className="flex items-center gap-1.5 rounded-full border border-lux-line/70 px-1.5 py-0.5">
                        <button onClick={() => setTaskPomodoros(t.id, -1)} className="text-lux-dim" aria-label="减少番茄钟">−</button>
                        <span className="numeric text-[11px] text-lux-text">{t.pomodoros} 🍅</span>
                        <button onClick={() => setTaskPomodoros(t.id, 1)} className="text-lux-dim" aria-label="增加番茄钟">+</button>
                      </div>
                      {t.recurring && <Tag tone="sage">🔁 每日</Tag>}
                      {t.carriedOver && !t.done && <Tag tone="amber">↩ 顺延</Tag>}
                      {t.deep && <Tag>深度专注</Tag>}
                      {t.revenue && <Tag tone="amber">收入</Tag>}
                      {t.product && <Tag tone="amber">产品</Tag>}
                      {t.health && <Tag tone="sage">健康</Tag>}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="relative h-2 flex-1">
                        <div className="absolute inset-0 rounded-full bg-lux-line" />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${t.progress ?? 0}%`, background: "var(--grad-sage)" }}
                        />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={t.progress ?? 0}
                          onChange={(e) => setTaskProgress(t.id, Number(e.target.value))}
                          aria-label="完成进度"
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </div>
                      <span className="numeric w-9 shrink-0 text-right text-[11px] text-lux-faint">
                        {t.progress ?? 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <button
                    onClick={() => toggleDone(t.id)}
                    className={`text-[11px] font-medium ${t.done ? "text-lux-sage" : "text-lux-dim"}`}
                  >
                    {t.done ? "↩ 标记未完成" : "✓ 标记完成"}
                  </button>
                  <button
                    onClick={() => toggleRecurring(t.id)}
                    className={`text-[11px] ${t.recurring ? "text-lux-sage" : "text-lux-faint"}`}
                  >
                    {t.recurring ? "🔁 每日 · 取消" : "设为每日"}
                  </button>
                  <button onClick={() => toggleOptional(t.id)} className="text-[11px] text-lux-faint">
                    {t.optional ? "↩ 放回今天" : "今天可以不做"}
                  </button>
                  <button onClick={() => startEdit(t.id, t.title)} className="text-[11px] text-lux-faint">✎ 改名</button>
                  <button onClick={() => removeTask(t.id)} className="text-[11px] text-lux-faint">✕ 删除</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewTask();
              }}
              placeholder="+ 手动加一个任务"
              className="flex-1 rounded-xl border border-lux-line/70 bg-lux-card/60 px-3 py-2.5 text-sm text-lux-text backdrop-blur-md placeholder:text-lux-faint focus:border-lux-sage/50 focus:outline-none"
            />
            <button
              onClick={commitNewTask}
              disabled={!newTask.trim()}
              className="shrink-0 rounded-xl border border-lux-line/70 bg-lux-card/60 px-4 text-sm text-lux-dim transition-opacity disabled:opacity-30"
            >
              添加
            </button>
          </div>

          <p className="mb-2 mt-7 text-[11px] uppercase tracking-widest text-lux-faint">
            自动排进番茄钟 · 共 {totalPomodoros} 个
          </p>
          <div className="space-y-2">
            {slots.length === 0 && (
              <p className="text-sm text-lux-faint">所有任务都被标记为可不做。</p>
            )}
            {slots.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-lux-line/70 bg-lux-card/50 px-4 py-3 backdrop-blur-md"
              >
                <div>
                  <p className="text-sm font-medium text-lux-text">{s.taskTitle}</p>
                  <p className="numeric text-xs text-lux-faint">
                    {fmtClock(s.startMin)} – {fmtClock(s.endMin)} · {s.pomodoros} 番茄钟
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-lux-amber">
                  {s.start < 12 * 60 ? "AM" : "PM"}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              confirmPlan();
              router.push("/pro");
            }}
            className={`mt-7 w-full rounded-2xl py-3.5 text-sm font-semibold transition-colors ${
              planConfirmed
                ? "border border-lux-sage/40 bg-lux-sage/10 text-lux-sage"
                : "text-lux-bg shadow-[var(--lux-shadow)]"
            }`}
            style={planConfirmed ? undefined : { backgroundImage: "var(--grad-sage)" }}
          >
            {planConfirmed ? "✓ 计划已确认 — 进入执行" : "确认计划，进入执行模式 →"}
          </button>
        </>
      )}
    </div>
  );
}

function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "amber" | "sage";
}) {
  const cls =
    tone === "amber"
      ? "border-lux-amber/30 text-lux-amber"
      : tone === "sage"
      ? "border-lux-sage/30 text-lux-sage"
      : "border-lux-line/70 text-lux-faint";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>{children}</span>;
}
