"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// Types
// ============================================================
interface WorkExperience {
  id: number;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  id: number;
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate: string;
}

interface ResumeData {
  name: string;
  position: string;
  phone: string;
  email: string;
  website: string;
  avatar: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string;
}

interface JDAnalysis {
  core_deliverables: string[];
  ats_keywords: string[];
  soft_traits: string[];
  ideal_candidate: string;
  resume_action_plan: string[];
}

const DEFAULT_DATA: ResumeData = {
  name: "张明远",
  position: "智能座舱产品研发与用户研究经理",
  phone: "138-0000-1234",
  email: "mingyuan.zhang@email.com",
  website: "github.com/mingyuan-zhang",
  avatar: "",
  workExperience: [
    {
      id: 1,
      company: "某全球合规主机厂（欧洲总部）",
      title: "高级产品经理 - 智能座舱 HCI",
      startDate: "2020-03",
      endDate: "至今",
      description:
        "• 主导基于 Kano 模型的座舱功能需求分类与优先级排序，覆盖 200+ 功能需求点，推动 85% 的高优先级需求进入 Sprint 开发\n• 运用 ANOVA 及回归分析方法评估 HMI 原型可用性指标（任务完成率、错误率、NASA-TLX），迭代优化后核心任务完成率提升 32%\n• 管理横跨德国、中国、美国的跨职能团队（15+ 人），推动 L3 级自动驾驶 HMI 交互框架从概念到 SOP",
    },
    {
      id: 2,
      company: "某 Tier-1 汽车零部件供应商（上海）",
      title: "产品主管 - 智能座舱",
      startDate: "2017-07",
      endDate: "2020-02",
      description:
        "• 负责虚拟化座舱域控制器产品定义与量产交付，覆盖 3 个主流车厂平台\n• 通过聚类分析与用户画像技术识别高价值场景，主导新增 12 个核心交互功能\n• 与嵌入式软件团队协作，在已有硬件约束下优化仪表盘渲染性能，帧率提升 40%",
    },
  ],
  education: [
    {
      id: 1,
      school: "浙江大学",
      major: "工业设计（人机交互方向）",
      degree: "学士",
      startDate: "2012-09",
      endDate: "2016-06",
    },
    {
      id: 2,
      school: "Imperial College London",
      major: "Human-Computer Interaction",
      degree: "硕士",
      startDate: "2016-09",
      endDate: "2017-12",
    },
  ],
  skills: "Kano模型, ANOVA, 回归分析, 用户画像, 聚类分析, NASA-TLX, 原型设计, Figma, 可用性测试, 产品策略, 跨团队协作, 敏捷开发",
};

const JD_CONTEXT_KEY = "current_jd_context";
const RESUME_DATA_KEY = "resume_data_cache";

// ============================================================
// Helper
// ============================================================
function escHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => map[c] || c);
}

function sortByDate<T extends { startDate?: string; endDate?: string }>(
  arr: T[]
): T[] {
  return [...arr].sort((a, b) => {
    const getVal = (s?: string) => (!s || s === "至今" ? "9999-99" : s);
    const endA = getVal(a.endDate);
    const endB = getVal(b.endDate);
    if (endA !== endB) return endB.localeCompare(endA);
    const startA = getVal(a.startDate);
    const startB = getVal(b.startDate);
    return startB.localeCompare(startA);
  });
}

// ============================================================
// UUID Generator
// ============================================================
let _idCounter = 100;
function genId() {
  return ++_idCounter;
}

// ============================================================
// Component
// ============================================================
export default function Home() {
  const [activeTab, setActiveTab] = useState<"jd" | "resume">("jd");
  const [jdContext, setJdContext] = useState<JDAnalysis | null>(null);
  const [showJdBanner, setShowJdBanner] = useState(true);

  // JD Analysis state
  const [jdText, setJdText] = useState("");
  const [jdLoading, setJdLoading] = useState(false);
  const [jdResult, setJdResult] = useState<JDAnalysis | null>(null);
  const [jdError, setJdError] = useState("");

  // Resume builder state
  const [data, setData] = useState<ResumeData>({ ...DEFAULT_DATA });
  const [zoom, setZoom] = useState(0.7);
  const [localFileHandle, setLocalFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [syncStatus, setSyncStatus] = useState("未关联本地文件");
  const [hasSaved, setHasSaved] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  // Inline polish state
  const [polishLoading, setPolishLoading] = useState<Record<number, boolean>>({});
  const [polishSuggestion, setPolishSuggestion] = useState<Record<number, string>>({});

  const a4CanvasRef = useRef<HTMLDivElement>(null);
  const skillsInputRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem(RESUME_DATA_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setData((prev) => ({ ...prev, ...parsed }));
      } catch { /* ignore */ }
    }

    const jdStr = localStorage.getItem(JD_CONTEXT_KEY);
    if (jdStr) {
      try {
        const parsed = JSON.parse(jdStr) as JDAnalysis;
        setJdContext(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(RESUME_DATA_KEY, JSON.stringify(data));
  }, [data]);

  // beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasSaved) {
        e.preventDefault();
        e.returnValue =
          "您的简历数据尚未保存到本地文件，关闭后数据将丢失。建议点击「新建本地文件」或「保存到本地」按钮";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasSaved]);

  // Keyboard zoom
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => Math.max(0.3, Math.min(2.0, z + (e.deltaY > 0 ? -0.05 : 0.05))));
      }
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, []);

  // ============ Basic Info Handlers ============
  const updateBasic = useCallback(
    (field: keyof ResumeData, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ============ Avatar ============
  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setData((prev) => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  // ============ Work Experience ============
  const addWork = useCallback(() => {
    setData((prev) => {
      const newEntry: WorkExperience = {
        id: genId(),
        company: "",
        title: "",
        startDate: "",
        endDate: "",
        description: "",
      };
      return { ...prev, workExperience: sortByDate([...prev.workExperience, newEntry]) };
    });
  }, []);

  const updateWork = useCallback((id: number, field: keyof WorkExperience, value: string) => {
    setData((prev) => {
      const list = prev.workExperience.map((w) =>
        w.id === id ? { ...w, [field]: value } : w
      );
      return { ...prev, workExperience: list };
    });
  }, []);

  const removeWork = useCallback((id: number) => {
    setData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.filter((w) => w.id !== id),
    }));
  }, []);

  // Ai optimize work
  const optimizeWork = useCallback(
    async (id: number) => {
      const entry = data.workExperience.find((w) => w.id === id);
      if (!entry || !entry.description.trim()) return;
      setExportStatus("⏳ AI 正在润色...");
      try {
        const jdCtx = jdContext;
        const res = await fetch("/api/optimize-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: entry.description, jdContext: jdCtx }),
        });
        const json = await res.json();
        if (json.success) {
          updateWork(id, "description", json.data);
          setExportStatus("✅ 润色完成");
        } else {
          setExportStatus("❌ " + json.error);
        }
      } catch {
        setExportStatus("❌ 网络错误，请重试");
      }
    },
    [data.workExperience, jdContext, updateWork]
  );

  // ============ General Polish (Step 1) ============
  const handleGeneralPolish = useCallback(
    async (id: number) => {
      const entry = data.workExperience.find((w) => w.id === id);
      if (!entry || !entry.description.trim()) return;
      setPolishLoading((prev) => ({ ...prev, [id]: true }));
      setPolishSuggestion((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        const res = await fetch("/api/general-polish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: entry.description }),
        });
        const json = await res.json();
        if (json.success) {
          setPolishSuggestion((prev) => ({ ...prev, [id]: json.data }));
        } else {
          setExportStatus("❌ " + json.error);
        }
      } catch {
        setExportStatus("❌ 网络错误，请重试");
      } finally {
        setPolishLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [data.workExperience]
  );

  const applyPolishSuggestion = useCallback(
    (id: number) => {
      const suggestion = polishSuggestion[id];
      if (!suggestion) return;
      updateWork(id, "description", suggestion);
      setPolishSuggestion((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [polishSuggestion, updateWork]
  );

  const applyPolish = useCallback(
    (_type: string, id: number) => {
      applyPolishSuggestion(id);
    },
    [applyPolishSuggestion]
  );

  const cancelPolish = useCallback((id: number) => {
    setPolishSuggestion((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const cancelPolishSuggestion = useCallback((id: number) => {
    setPolishSuggestion((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // ============ Education ============
  const addEdu = useCallback(() => {
    setData((prev) => {
      const newEntry: Education = {
        id: genId(),
        school: "",
        major: "",
        degree: "",
        startDate: "",
        endDate: "",
      };
      return { ...prev, education: sortByDate([...prev.education, newEntry]) };
    });
  }, []);

  const updateEdu = useCallback((id: number, field: keyof Education, value: string) => {
    setData((prev) => {
      const list = prev.education.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      );
      return { ...prev, education: list };
    });
  }, []);

  const removeEdu = useCallback((id: number) => {
    setData((prev) => ({
      ...prev,
      education: prev.education.filter((e) => e.id !== id),
    }));
  }, []);

  // ============ Skills ============
  const skillsArray = data.skills
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const addSkill = useCallback((value: string) => {
    const clean = value.replace(/[,，\n]/g, "").trim();
    if (!clean) return;
    setData((prev) => {
      const current = prev.skills
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (current.includes(clean)) return prev;
      return { ...prev, skills: [...current, clean].join(", ") };
    });
  }, []);

  const removeSkill = useCallback((skill: string) => {
    setData((prev) => {
      const current = prev.skills
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => s !== skill);
      return { ...prev, skills: current.join(", ") };
    });
  }, []);

  // ============ File System Access API ============
  const createNewFile = useCallback(async () => {
    try {
      const win = window as any;
      const handle = await win.showSaveFilePicker({
        types: [
          {
            description: "简历文件",
            accept: { "application/json": [".json"] },
          },
        ],
        suggestedName: "my_resume.json",
      });
      setLocalFileHandle(handle);
      setSyncStatus(`📄 已关联: ${handle.name}`);
      // Write initial data
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      setHasSaved(true);
      setSyncStatus(`✅ 已保存: ${handle.name}`);
    } catch (err: any) {
      if (err.name !== "AbortError" && err.name !== "SecurityError") {
        setSyncStatus("❌ 取消操作");
      }
    }
  }, [data]);

  const saveToLocalFile = useCallback(async () => {
    if (!localFileHandle) {
      setSyncStatus("⚠️ 请先点击「新建本地文件」关联文件");
      return;
    }
    try {
      const writable = await localFileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      setHasSaved(true);
      setSyncStatus(`✅ 已保存: ${localFileHandle.name}`);
    } catch {
      // Permission lost - request again
      try {
        const win = window as any;
        const handle = await win.showSaveFilePicker({
          types: [
            {
              description: "简历文件",
              accept: { "application/json": [".json"] },
            },
          ],
          suggestedName: localFileHandle.name || "my_resume.json",
        });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        setLocalFileHandle(handle);
        setHasSaved(true);
        setSyncStatus(`✅ 已保存: ${handle.name}`);
      } catch {
        setSyncStatus("❌ 保存失败：权限丢失");
      }
    }
  }, [data, localFileHandle]);

  const openLocalFile = useCallback(async () => {
    try {
      const win = window as any;
      const [handle] = await win.showOpenFilePicker({
        types: [
          {
            description: "简历文件",
            accept: { "application/json": [".json"] },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      // Normalize
      const normalized: ResumeData = {
        name: parsed.name || "",
        position: parsed.position || "",
        phone: parsed.phone || "",
        email: parsed.email || "",
        website: parsed.website || "",
        avatar: parsed.avatar || "",
        workExperience: Array.isArray(parsed.workExperience)
          ? parsed.workExperience.map((w: any) => ({ ...w, id: w.id || genId() }))
          : [],
        education: Array.isArray(parsed.education)
          ? parsed.education.map((e: any) => ({ ...e, id: e.id || genId() }))
          : [],
        skills: parsed.skills || "",
      };
      setData(normalized);
      setLocalFileHandle(handle);
      setHasSaved(true);
      setSyncStatus(`📂 已打开: ${handle.name}`);
    } catch (err: any) {
      if (err.name !== "AbortError" && err.name !== "SecurityError") {
        setSyncStatus("❌ 打开失败");
      }
    }
  }, []);

  // ============ JD Analysis ============
  const analyzeJD = useCallback(async () => {
    if (!jdText.trim()) return;
    setJdLoading(true);
    setJdError("");
    setJdResult(null);
    try {
      const res = await fetch("/api/analyze-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      });
      const json = await res.json();
      if (json.success) {
        setJdResult(json.data);
        setJdContext(json.data);
        localStorage.setItem(JD_CONTEXT_KEY, JSON.stringify(json.data));
        setShowJdBanner(true);
      } else {
        setJdError(json.error || "解析失败");
      }
    } catch {
      setJdError("网络错误，请重试");
    } finally {
      setJdLoading(false);
    }
  }, [jdText]);

  // ============ PDF Export ============
  const downloadPDF = useCallback(async () => {
    if (!a4CanvasRef.current) return;
    setExportStatus("⏳ 正在生成 PDF...");
    try {
      // Clone off-screen for full-size capture
      const original = a4CanvasRef.current;
      const clone = original.cloneNode(true) as HTMLElement;
      clone.style.cssText =
        "position:absolute;left:-9999px;top:0;width:210mm;padding:12mm 14mm;background:#fff;font-family:Arial,Helvetica,sans-serif;transform:none;box-shadow:none;";
      document.body.appendChild(clone);

      // Wait for render
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 100));

      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdfW = 210;
      const pdfH = 297;
      const finalW = pdfW;
      const finalH = (canvas.height / canvas.width) * pdfW;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(imgData, "JPEG", 0, 0, finalW, finalH);

      const name = data.name || "resume";
      pdf.save(`${name}_resume.pdf`);
      setExportStatus("✅ PDF 已下载");
    } catch {
      setExportStatus("❌ PDF 生成失败");
    }
  }, [data.name]);

  // ============ Word Export ============
  const downloadWord = useCallback(() => {
    setExportStatus("⏳ 正在生成 Word...");
    try {
      // Parse description -> HTML with bullet points
      const descToHtml = (text: string) => {
        const lines = text.split("\n").filter(Boolean);
        let html = "";
        let inList = false;
        for (const line of lines) {
          const trimmed = line.trim();
          const bulletMatch = trimmed.match(/^[\s]*[•\-\*]\s*(.*)/);
          if (bulletMatch) {
            if (!inList) {
              html += "<ul>";
              inList = true;
            }
            html += `<li>${escHtml(bulletMatch[1])}</li>`;
          } else {
            if (inList) {
              html += "</ul>";
              inList = false;
            }
            html += `<p style="margin:2px 0">${escHtml(trimmed)}</p>`;
          }
        }
        if (inList) html += "</ul>";
        return html || "<p></p>";
      };

      // Skills tags
      const skillHtml = skillsArray
        .map(
          (s) =>
            `<span style="display:inline-block;margin:2px 3px;padding:2px 10px;background:#eef2ff;color:#4338ca;border-radius:12px;font-size:9pt;font-weight:500;border:1px solid #c7d2fe;line-height:1.8">${escHtml(s)}</span>`
        )
        .join("");

      const workHtml = sortByDate(data.workExperience)
        .map(
          (w) => `
        <div style="margin-bottom:10px">
          <table cellpadding="0" cellspacing="0" style="width:100%;border:none">
            <tr>
              <td style="font-size:11pt;font-weight:600;color:#1d1d1f;padding:0;border:none">${escHtml(w.company)}</td>
              <td style="font-size:10pt;font-weight:500;color:#4b5563;padding:0 8px;border:none;text-align:center">${escHtml(w.title)}</td>
              <td style="font-size:9pt;color:#9ca3af;padding:0;border:none;text-align:right;white-space:nowrap">${escHtml(w.startDate)} - ${escHtml(w.endDate)}</td>
            </tr>
          </table>
          <div style="font-size:10pt;color:#374151;line-height:1.55;margin-top:4px">${descToHtml(w.description)}</div>
        </div>`
        )
        .join("");

      const eduHtml = sortByDate(data.education)
        .map(
          (e) => `
        <div style="margin-bottom:6px">
          <table cellpadding="0" cellspacing="0" style="width:100%;border:none">
            <tr>
              <td style="font-size:11pt;font-weight:600;color:#1d1d1f;padding:0;border:none">${escHtml(e.school)}</td>
              <td style="font-size:10pt;color:#4b5563;padding:0 8px;border:none;text-align:center">${escHtml(e.major)} · ${escHtml(e.degree)}</td>
              <td style="font-size:9pt;color:#9ca3af;padding:0;border:none;text-align:right;white-space:nowrap">${escHtml(e.startDate)} - ${escHtml(e.endDate)}</td>
            </tr>
          </table>
        </div>`
        )
        .join("");

      const avatarHtml = data.avatar
        ? `<img src="${data.avatar}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #e5e5ea;float:right;margin-left:12px" />`
        : "";

      const contacts = [
        data.phone && `<span>📞 ${escHtml(data.phone)}</span>`,
        data.email && `<span>✉️ ${escHtml(data.email)}</span>`,
        data.website && `<span>🌐 ${escHtml(data.website)}</span>`,
      ]
        .filter(Boolean)
        .join("&nbsp;&nbsp;|&nbsp;&nbsp;");

      const wordHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="UTF-8"><title>简历</title>
<style>
  body { font-family: 'PingFang SC','Microsoft YaHei',Arial,Helvetica,sans-serif; padding:40px; color:#1d1d1f; line-height:1.5; max-width:800px; margin:0 auto; }
  h1 { font-size:22pt; font-weight:700; margin:0 0 2px; }
  .title-line { font-size:12pt; color:#2563eb; font-weight:500; margin-bottom:4px; }
  .contact-line { font-size:9pt; color:#6b7280; margin-bottom:14px; }
  .header-div { border-bottom:2px solid #2563eb; margin-bottom:14px; padding-bottom:12px; }
  .header-div:after { content:''; display:table; clear:both; }
  .section-title { font-size:12pt; font-weight:700; color:#1d1d1f; margin:12px 0 6px; padding-left:8px; border-left:3px solid #2563eb; }
  .section-divider { height:1px; background:#e5e5ea; margin:8px 0; }
  ul { margin:4px 0; padding-left:20px; }
  li { margin:1px 0; }
  li::marker { color:#2563eb; }
  .skills-wrap { margin:4px 0; }
</style></head>
<body>
  <div class="header-div">
    ${avatarHtml}
    <h1>${escHtml(data.name || "")}</h1>
    <div class="title-line">${escHtml(data.position || "")}</div>
    <div class="contact-line">${contacts}</div>
  </div>
  <div class="section-title">💼 工作经历</div>
  ${workHtml || "<p style='color:#9ca3af'>暂无</p>"}
  <div class="section-divider"></div>
  <div class="section-title">🎓 教育经历</div>
  ${eduHtml || "<p style='color:#9ca3af'>暂无</p>"}
  <div class="section-divider"></div>
  <div class="section-title">🔧 核心技能</div>
  <div class="skills-wrap">${skillHtml || "<p style='color:#9ca3af'>暂无</p>"}</div>
</body></html>`;

      const blob = new Blob([wordHtml], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name || "resume"}_resume.doc`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus("✅ Word 已下载");
    } catch {
      setExportStatus("❌ Word 生成失败");
    }
  }, [data, skillsArray]);

  // ============ Render A4 Canvas HTML ============
  const renderCanvasHTML = useCallback(() => {
    const d = data;
    const sortedWork = sortByDate(d.workExperience);
    const sortedEdu = sortByDate(d.education);
    const skills = d.skills
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const workHtml = sortedWork
      .map(
        (w) => `
      <div class="resume-entry">
        <div class="resume-entry-header">
          <div>
            <div class="resume-entry-company">${escHtml(w.company)}</div>
            <div class="resume-entry-title">${escHtml(w.title)}</div>
          </div>
          <div class="resume-entry-date">${escHtml(w.startDate)} - ${escHtml(w.endDate)}</div>
        </div>
        <div class="resume-entry-desc">${escHtml(w.description)}</div>
      </div>`
      )
      .join("");

    const eduHtml = sortedEdu
      .map(
        (e) => `
      <div class="resume-entry">
        <div class="resume-entry-header">
          <div>
            <div class="resume-entry-company">${escHtml(e.school)}</div>
            <div class="resume-entry-title">${escHtml(e.major)} · ${escHtml(e.degree)}</div>
          </div>
          <div class="resume-entry-date">${escHtml(e.startDate)} - ${escHtml(e.endDate)}</div>
        </div>
      </div>`
      )
      .join("");

    const skillHtml = skills
      .map((s) => `<span class="resume-skill-tag">${escHtml(s)}</span>`)
      .join("");

    const avatarHtml = d.avatar
      ? `<img class="resume-avatar-img" src="${d.avatar}" alt="头像" />`
      : `<div class="resume-avatar-img" style="background:#e5e5ea;border-radius:50%;width:60px;height:60px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:24px">👤</div>`;

    const contacts = [
      d.phone && `<span>📞 ${escHtml(d.phone)}</span>`,
      d.email && `<span>✉️ ${escHtml(d.email)}</span>`,
      d.website && `<span>🌐 ${escHtml(d.website)}</span>`,
    ]
      .filter(Boolean)
      .join("");

    return `
      <div class="resume-header">
        <div class="resume-header-info">
          <div class="resume-name">${escHtml(d.name || "（请填写姓名）")}</div>
          <div class="resume-title-line">${escHtml(d.position || "")}</div>
          <div class="resume-contact">${contacts}</div>
        </div>
        ${avatarHtml}
      </div>
      <div class="resume-section">
        <div class="resume-section-title">💼 工作经历</div>
        <div class="resume-section-divider"></div>
        ${workHtml || '<div style="color:#9ca3af;font-size:10pt">暂无工作经历</div>'}
      </div>
      <div class="resume-section">
        <div class="resume-section-title">🎓 教育经历</div>
        <div class="resume-section-divider"></div>
        ${eduHtml || '<div style="color:#9ca3af;font-size:10pt">暂无教育经历</div>'}
      </div>
      ${skills.length ? `
      <div class="resume-section">
        <div class="resume-section-title">🔧 核心技能</div>
        <div class="resume-section-divider"></div>
        <div class="resume-skills">${skillHtml}</div>
      </div>` : ""}
    `;
  }, [data]);

  // ============ Skills input handler ============
  const handleSkillsKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const input = e.currentTarget;
        addSkill(input.value);
        input.value = "";
      }
      if (e.key === "Backspace" && !e.currentTarget.value) {
        const arr = data.skills
          .split(/[,，\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (arr.length) removeSkill(arr[arr.length - 1]);
      }
    },
    [addSkill, removeSkill, data.skills]
  );

  const handleSkillsBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value.trim()) {
        addSkill(e.target.value);
        e.target.value = "";
      }
    },
    [addSkill]
  );

  // ============ JD Context Banner ============
  const jdContextKeywords = jdContext
    ? jdContext.ats_keywords?.slice(0, 5).join(", ")
    : "";

  // ============ Render ============
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {/* ===== Tabs ===== */}
      <div className="tabs-container">
        <div className="tabs-segmented">
          <button
            className={`tab-btn ${activeTab === "jd" ? "active" : ""}`}
            onClick={() => setActiveTab("jd")}
          >
            📋 第一步：JD 深度解析
          </button>
          <button
            className={`tab-btn ${activeTab === "resume" ? "active" : ""}`}
            onClick={() => setActiveTab("resume")}
          >
            ✏️ 第二步：简历智能打磨
          </button>
        </div>
      </div>

      {/* ===== JD Context Banner ===== */}
      {activeTab === "resume" && jdContext && showJdBanner && (
        <div className="jd-context-banner">
          <span>✨ 当前已加载 JD 上下文：</span>
          <strong style={{ fontSize: 12 }}>
            {jdContextKeywords || "已加载分析结果"}
          </strong>
          <button className="dismiss-btn" onClick={() => setShowJdBanner(false)}>
            ✕
          </button>
        </div>
      )}

      {/* ===== Tab 1: JD Analysis ===== */}
      <div
        className={`tab-content ${activeTab === "jd" ? "active" : ""}`}
        style={{ flex: 1 }}
      >
        <div className="jd-view">
          {/* Left Input Panel */}
          <div className="jd-input-panel">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              粘贴职位描述
            </div>
            <textarea
              placeholder="请在此粘贴目标职位的完整 Job Description..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
            <button
              className="analyze-btn"
              disabled={jdLoading || !jdText.trim()}
              onClick={analyzeJD}
            >
              {jdLoading ? "⏳ 正在解析..." : "🚀 逆向解析 JD"}
            </button>
            {jdError && (
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#dc2626",
                }}
              >
                {jdError}
              </div>
            )}
          </div>

          {/* Right Results Panel */}
          <div className="jd-results-panel">
            {jdLoading && (
              <div className="loading-spinner">
                <div className="spinner" />
                <span>AI 正在逆向解析 JD...</span>
              </div>
            )}

            {jdResult && !jdLoading && (
              <>
                <div className="jd-results-scroll">
                  <div className="jd-grid-2x2">
                    {/* 核心业务交付物 */}
                    <div className="jd-mini-card">
                      <div className="jd-mini-icon">📋</div>
                      <div className="jd-mini-title">核心业务交付物</div>
                      <ul className="jd-bullet-list">
                        {jdResult.core_deliverables?.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    {/* ATS 关键词 */}
                    <div className="jd-mini-card">
                      <div className="jd-mini-icon">🎯</div>
                      <div className="jd-mini-title">ATS 必含关键词</div>
                      <div className="ats-tags">
                        {jdResult.ats_keywords?.map((kw, i) => (
                          <span key={i} className="ats-tag">{kw}</span>
                        ))}
                      </div>
                    </div>
                    {/* 隐性红线与软素质 */}
                    <div className="jd-mini-card">
                      <div className="jd-mini-icon">⭐</div>
                      <div className="jd-mini-title">隐性红线与软素质</div>
                      <ul className="jd-bullet-list">
                        {jdResult.soft_traits?.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    {/* 理想候选人画像 */}
                    <div className="jd-mini-card">
                      <div className="jd-mini-icon">👤</div>
                      <div className="jd-mini-title">理想候选人画像</div>
                      <p className="jd-candidate-desc">
                        {jdResult.ideal_candidate || "暂无数据"}
                      </p>
                    </div>
                  </div>

                  {/* 简历修改指令 */}
                  {jdResult.resume_action_plan && jdResult.resume_action_plan.length > 0 && (
                    <div className="jd-action-plan">
                      <div className="jd-action-plan-title">💡 简历修改指令</div>
                      <ul className="jd-action-list">
                        {jdResult.resume_action_plan.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {!jdResult && !jdLoading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#86868b",
                  fontSize: 14,
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 40 }}>🔍</span>
                <span>在左侧粘贴 JD 并点击分析按钮</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Tab 2: Resume Builder ===== */}
      <div
        className={`tab-content ${activeTab === "resume" ? "active" : ""}`}
        style={{ flex: 1 }}
      >
        <div className="resume-view">
          {/* Left Panel - Form */}
          <div className="left-panel">
            <div className="left-scroll">
              {/* Privacy Banner */}
              <div className="privacy-banner">
                <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
                <span>
                  关闭窗口后数据将自动清除，不会残留。请务必保存到本地 .json 文件！
                </span>
              </div>

              {/* Sync Panel */}
              <div className="sync-panel">
                <div className="sync-panel-title">💾 本地文件同步</div>
                <div className="sync-buttons">
                  <button className="btn btn-outline btn-sm" onClick={createNewFile}>
                    📄 新建关联
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={openLocalFile}>
                    📂 打开文件
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={saveToLocalFile}>
                    💾 保存
                  </button>
                </div>
                <div className="sync-status">{syncStatus}</div>
              </div>

              {/* Export Panel */}
              <div className="export-panel">
                <div className="export-panel-title">📤 导出简历</div>
                <div className="export-buttons">
                  <button className="btn btn-outline btn-sm" onClick={downloadPDF}>
                    📕 导出 PDF
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={downloadWord}>
                    📘 导出 Word
                  </button>
                </div>
                <div className="export-status">{exportStatus}</div>
              </div>

              {/* Basic Info */}
              <div className="form-section">
                <div className="form-section-title">基本信息</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="form-label">姓名</label>
                  <input
                    className="form-input"
                    placeholder="请输入姓名"
                    value={data.name}
                    onChange={(e) => updateBasic("name", e.target.value)}
                  />
                  <label className="form-label">求职意向</label>
                  <input
                    className="form-input"
                    placeholder="目标职位"
                    value={data.position}
                    onChange={(e) => updateBasic("position", e.target.value)}
                  />
                  <div className="form-grid-2">
                    <div>
                      <label className="form-label">联系电话</label>
                      <input
                        className="form-input"
                        placeholder="手机号"
                        value={data.phone}
                        onChange={(e) => updateBasic("phone", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">电子邮箱</label>
                      <input
                        className="form-input"
                        placeholder="email@example.com"
                        value={data.email}
                        onChange={(e) => updateBasic("email", e.target.value)}
                      />
                    </div>
                  </div>
                  <label className="form-label">
                    个人网站 / GitHub{" "}
                    <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 11 }}>
                      (可选)
                    </span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="github.com/yourname"
                    value={data.website}
                    onChange={(e) => updateBasic("website", e.target.value)}
                  />
                </div>
              </div>

              {/* Avatar */}
              <div className="form-section">
                <div className="form-section-title">头像</div>
                <div className="avatar-upload-wrap">
                  {data.avatar ? (
                    <img className="avatar-preview-sm" src={data.avatar} alt="头像" />
                  ) : (
                    <div
                      className="avatar-preview-sm"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                        fontSize: 20,
                      }}
                    >
                      👤
                    </div>
                  )}
                  <label
                    className="btn btn-outline btn-sm"
                    style={{ cursor: "pointer" }}
                  >
                    📷 上传
                    <input
                      ref={avatarFileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  {data.avatar && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setData((prev) => ({ ...prev, avatar: "" }))}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>

              {/* Work Experience */}
              <div className="form-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div className="form-section-title" style={{ margin: 0, border: "none", padding: 0 }}>
                    工作经历
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={addWork}>
                    + 添加
                  </button>
                </div>
                {sortByDate(data.workExperience).map((w) => (
                  <div key={w.id} className="entry-card">
                    <div className="entry-card-header">
                      <span className="entry-label">{w.company || "新条目"}</span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeWork(w.id)}
                      >
                        删除
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div className="form-grid-2">
                        <input
                          className="form-input"
                          placeholder="公司名称"
                          value={w.company}
                          onChange={(e) => updateWork(w.id, "company", e.target.value)}
                        />
                        <input
                          className="form-input"
                          placeholder="职位名称"
                          value={w.title}
                          onChange={(e) => updateWork(w.id, "title", e.target.value)}
                        />
                      </div>
                      <div className="form-grid-2">
                        <input
                          className="form-input"
                          type="text"
                          placeholder="开始时间 (如 2020-03)"
                          value={w.startDate}
                          onChange={(e) => updateWork(w.id, "startDate", e.target.value)}
                        />
                        <input
                          className="form-input"
                          type="text"
                          placeholder="结束时间 (或 至今)"
                          value={w.endDate}
                          onChange={(e) => updateWork(w.id, "endDate", e.target.value)}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 2 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleGeneralPolish(w.id)}
                          disabled={!w.description.trim() || polishLoading[w.id]}
                          style={{ fontSize: 11, padding: "2px 8px" }}
                        >
                          {polishLoading[w.id] ? "思考中..." : "✨ 通用润色"}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled
                          title="请先完成 JD 深度解析"
                          style={{ fontSize: 11, padding: "2px 8px", opacity: 0.4, cursor: "not-allowed" }}
                        >
                          🎯 适配 JD
                        </button>
                      </div>
                      <textarea
                        className="form-textarea"
                        placeholder="核心工作内容与量化成果"
                        rows={3}
                        value={w.description}
                        onChange={(e) => updateWork(w.id, "description", e.target.value)}
                      />
                      {polishSuggestion[w.id] && (
                        <div className="polish-suggestion-box">
                          <div className="polish-suggestion-label">AI 润色建议</div>
                          <div className="polish-suggestion-text">{polishSuggestion[w.id]}</div>
                          <div className="polish-suggestion-actions">
                            <button className="btn-apply" onClick={() => applyPolish("work", w.id)}>✅ 应用</button>
                            <button className="btn-cancel" onClick={() => cancelPolish(w.id)}>❌ 取消</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {data.workExperience.length === 0 && (
                  <div style={{ color: "#9ca3af", fontSize: 12, padding: "8px 0" }}>
                    暂无工作经历，点击"+ 添加"开始
                  </div>
                )}
              </div>

              {/* Education */}
              <div className="form-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div className="form-section-title" style={{ margin: 0, border: "none", padding: 0 }}>
                    教育经历
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={addEdu}>
                    + 添加
                  </button>
                </div>
                {sortByDate(data.education).map((edu) => (
                  <div key={edu.id} className="entry-card">
                    <div className="entry-card-header">
                      <span className="entry-label">{edu.school || "新条目"}</span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeEdu(edu.id)}
                      >
                        删除
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div className="form-grid-2">
                        <input
                          className="form-input"
                          placeholder="学校名称"
                          value={edu.school}
                          onChange={(ev) => updateEdu(edu.id, "school", ev.target.value)}
                        />
                        <input
                          className="form-input"
                          placeholder="专业名称"
                          value={edu.major}
                          onChange={(ev) => updateEdu(edu.id, "major", ev.target.value)}
                        />
                      </div>
                      <div className="form-grid-3">
                        <input
                          className="form-input"
                          placeholder="学位 (学士/硕士)"
                          value={edu.degree}
                          onChange={(ev) => updateEdu(edu.id, "degree", ev.target.value)}
                        />
                        <input
                          className="form-input"
                          type="text"
                          placeholder="开始"
                          value={edu.startDate}
                          onChange={(ev) => updateEdu(edu.id, "startDate", ev.target.value)}
                        />
                        <input
                          className="form-input"
                          type="text"
                          placeholder="结束"
                          value={edu.endDate}
                          onChange={(ev) => updateEdu(edu.id, "endDate", ev.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {data.education.length === 0 && (
                  <div style={{ color: "#9ca3af", fontSize: 12, padding: "8px 0" }}>
                    暂无教育经历，点击"+ 添加"开始
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="form-section">
                <div className="form-section-title">核心技能</div>
                <input
                  ref={skillsInputRef}
                  className="form-input"
                  placeholder="输入技能后按 Enter 或逗号添加"
                  onKeyDown={handleSkillsKeyDown}
                  onBlur={handleSkillsBlur}
                />
                <div className="skills-container">
                  {skillsArray.map((s, i) => (
                    <span
                      key={i}
                      className="skill-tag"
                      onClick={() => removeSkill(s)}
                    >
                      {s}
                      <span className="remove-tag">×</span>
                    </span>
                  ))}
                  {skillsArray.length === 0 && (
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>
                      暂无技能
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - A4 Canvas */}
          <div className="right-panel">
            {/* Zoom Controls */}
            <div className="zoom-controls">
              <button
                className="zoom-btn"
                onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
                title="缩小"
              >
                −
              </button>
              <span className="zoom-label">{Math.round(zoom * 100)}%</span>
              <button
                className="zoom-btn"
                onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
                title="放大"
              >
                +
              </button>
              <button
                className="zoom-btn"
                onClick={() => setZoom(0.7)}
                title="复位"
                style={{ fontSize: 11, width: "auto", padding: "0 6px" }}
              >
                ⌂
              </button>
            </div>

            {/* Canvas Wrapper */}
            <div className="canvas-wrapper">
              <div
                ref={a4CanvasRef}
                className="a4-canvas"
                style={{ transform: `scale(${zoom})` }}
                dangerouslySetInnerHTML={{ __html: renderCanvasHTML() }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}