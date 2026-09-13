"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Club, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/client";

export default function ResetPassword() {
  const token = useRef("");
  const initialized = useRef(false);
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    token.current = new URLSearchParams(location.hash.slice(1)).get("key") || "";
    history.replaceState(null, "", "/reset");
    setReady(Boolean(token.current));
    if (!token.current) setError("请从你的专属重设链接打开此页面。");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") || "");
    const confirmation = String(values.get("confirmation") || "");
    if (password !== confirmation) {
      setError("两次输入的密码不一致，请重新确认。");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth", { action: "reset", token: token.current, username: "MartinHamburger", password });
      form.reset();
      token.current = "";
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "暂时无法保存，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  return <main className="reset-shell">
    <section className="reset-card">
      <a href="/" className="brand"><span className="brand-icon"><Club size={21}/></span><span>娱乐中心<small>好 友 游 戏 室</small></span></a>
      {done ? <div className="reset-success" role="status">
        <CheckCircle2 size={38}/><h1>新密码已保存</h1>
        <p>旧密码和已有登录已失效。现在可以用新密码重新入座。</p>
        <Button asChild><a href="/">前往登录</a></Button>
      </div> : <>
        <div className="section-tag">管 理 员 账 号</div>
        <h1>重新设置密码</h1>
        <p className="reset-description">为 <strong>MartinHamburger</strong> 输入你自己设定的新密码。无需提供旧密码。</p>
        <form onSubmit={submit} className="reset-form">
          <label htmlFor="reset-username">用户名</label>
          <Input id="reset-username" autoComplete="username" value="MartinHamburger" readOnly/>
          <label htmlFor="new-password">新密码</label>
          <Input id="new-password" name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={10} maxLength={128} placeholder="至少 10 个字符" required disabled={busy || !ready}/>
          <label htmlFor="confirm-password">再输入一次新密码</label>
          <Input id="confirm-password" name="confirmation" type={show ? "text" : "password"} autoComplete="new-password" minLength={10} maxLength={128} placeholder="确认你的新密码" required disabled={busy || !ready}/>
          <div className="reset-show"><Checkbox id="show-password" checked={show} onCheckedChange={value => setShow(value === true)}/><label htmlFor="show-password">显示密码，核对输入</label></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button type="submit" disabled={busy || !ready} className="primary-button">{busy ? "正在保存…" : "保存新密码"}</Button>
        </form>
        <p className="reset-note"><LockKeyhole size={16}/><span>链接仅可使用一次。保存成功后，其他设备需要重新登录。</span></p>
      </>}
    </section>
  </main>;
}
