export function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
}

export function setNavbarStatus(msg: string) {
  const status = document.getElementById("status");
  if (!status) return;
  status.className = "nav-status"
  status.textContent = msg.toUpperCase();
}

export function setNavbarError(msg: string) {
  const status = document.getElementById("status");
  if (!status) return;
  status.className = "nav-status-error";
  status.textContent = msg.toUpperCase();
}
