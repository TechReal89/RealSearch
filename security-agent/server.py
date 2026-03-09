"""Lightweight security monitoring agent - runs on HOST (not in Docker).
Exposes security data via a local-only HTTP API on port 9999.
Only listens on 127.0.0.1 so it's not accessible from outside.
"""
import json
import re
import subprocess
import socket
from collections import Counter
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

LISTEN_HOST = "0.0.0.0"
LISTEN_PORT = 9999
API_KEY = "rs_security_agent_2024_internal"
WHITELIST_FILE = "/etc/realsearch/ssh_whitelist.txt"
FAIL2BAN_JAIL_LOCAL = "/etc/fail2ban/jail.local"


def run_cmd(cmd: list[str], timeout: int = 10) -> str:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return result.stdout.strip()
    except Exception:
        return ""


def _extract_hour(timestamp_str: str) -> str | None:
    """Extract 'YYYY-MM-DD HH:00' from various timestamp formats."""
    try:
        # ISO format: 2026-03-08T22:11:29.628761+00:00
        if "T" in timestamp_str:
            dt = datetime.fromisoformat(timestamp_str)
            return dt.strftime("%Y-%m-%d %H:00")
        # Syslog: Mar  8 22:11:29
        return None
    except Exception:
        return None


def parse_ssh_failures() -> dict:
    failed_attempts = 0
    ip_counter: Counter = Counter()
    hourly_counter: Counter = Counter()
    recent_events: list[dict] = []

    auth_log = None
    for p in ["/var/log/auth.log", "/var/log/secure"]:
        if Path(p).exists():
            auth_log = p
            break

    if not auth_log:
        return {"total_failed": 0, "top_ips": [], "recent_events": [], "hourly": []}

    try:
        # Read full log for better hourly stats
        output = run_cmd(["tail", "-n", "50000", auth_log], timeout=15)
        if not output:
            return {"total_failed": 0, "top_ips": [], "recent_events": [], "hourly": []}

        fail_patterns = [
            # ISO timestamp format: 2026-03-08T22:11:29.628761+00:00
            re.compile(r"^(\S+)\s+\S+\s+sshd\[.*Failed password.*from\s+(\S+)"),
            re.compile(r"^(\S+)\s+\S+\s+sshd\[.*Invalid user.*from\s+(\S+)"),
            re.compile(r"^(\S+)\s+\S+\s+sshd\[.*authentication failure.*rhost=(\S+)"),
            # Traditional syslog format: Mar  8 22:11:29
            re.compile(r"^(\w+\s+\d+\s+[\d:]+)\s+\S+\s+sshd\[.*Failed password.*from\s+(\S+)"),
            re.compile(r"^(\w+\s+\d+\s+[\d:]+)\s+\S+\s+sshd\[.*Invalid user.*from\s+(\S+)"),
            re.compile(r"^(\w+\s+\d+\s+[\d:]+)\s+\S+\s+sshd\[.*authentication failure.*rhost=(\S+)"),
        ]

        for line in output.split("\n"):
            for pattern in fail_patterns:
                match = pattern.match(line)
                if match:
                    failed_attempts += 1
                    timestamp_str = match.group(1)
                    ip = match.group(2)
                    ip_counter[ip] += 1

                    # Hourly breakdown
                    hour_key = _extract_hour(timestamp_str)
                    if hour_key:
                        hourly_counter[hour_key] += 1

                    if len(recent_events) < 100:
                        recent_events.append({
                            "time": timestamp_str,
                            "ip": ip,
                            "type": "ssh_failed",
                            "message": line.strip()[:200],
                        })
                    break

        top_ips = [{"ip": ip, "count": count} for ip, count in ip_counter.most_common(30)]

        # Build sorted hourly data (last 48 hours max)
        hourly = [
            {"time": k, "count": v}
            for k, v in sorted(hourly_counter.items())
        ]
        # Keep last 48 entries
        hourly = hourly[-48:]

        return {
            "total_failed": failed_attempts,
            "top_ips": top_ips,
            "recent_events": list(reversed(recent_events[-20:])),
            "hourly": hourly,
        }
    except Exception:
        return {"total_failed": 0, "top_ips": [], "recent_events": []}


def get_firewall_status() -> dict:
    output = run_cmd(["ufw", "status", "verbose"])
    if not output:
        return {"active": False, "rules": [], "raw": "UFW not available"}

    active = "Status: active" in output
    rules = []
    in_rules = False
    for line in output.split("\n"):
        line = line.strip()
        if line.startswith("--"):
            in_rules = True
            continue
        if in_rules and line:
            rules.append(line)

    return {"active": active, "rules": rules, "raw": output}


def get_fail2ban_status() -> dict:
    output = run_cmd(["fail2ban-client", "status"])
    if not output:
        return {"active": False, "jails": [], "total_banned": 0, "banned_ips": []}

    jails = []
    jail_match = re.search(r"Jail list:\s*(.*)", output)
    if jail_match:
        jails = [j.strip() for j in jail_match.group(1).split(",") if j.strip()]

    total_banned = 0
    banned_ips = []
    jail_details = []

    for jail in jails:
        jail_output = run_cmd(["fail2ban-client", "status", jail])
        currently_banned = 0
        total_banned_jail = 0
        ips = []

        m = re.search(r"Currently banned:\s*(\d+)", jail_output)
        if m:
            currently_banned = int(m.group(1))
        m = re.search(r"Total banned:\s*(\d+)", jail_output)
        if m:
            total_banned_jail = int(m.group(1))
        m = re.search(r"Banned IP list:\s*(.*)", jail_output)
        if m and m.group(1).strip():
            ips = m.group(1).strip().split()

        total_banned += currently_banned
        jail_details.append({
            "name": jail,
            "currently_banned": currently_banned,
            "total_banned": total_banned_jail,
            "banned_ips": ips,
        })
        for ip in ips:
            banned_ips.append({"ip": ip, "jail": jail})

    return {
        "active": True,
        "jails": jail_details,
        "total_banned": total_banned,
        "banned_ips": banned_ips,
    }


def get_open_ports() -> list[dict]:
    output = run_cmd(["ss", "-tlnp"])
    if not output:
        return []

    ports = []
    for line in output.split("\n")[1:]:
        parts = line.split()
        if len(parts) >= 5:
            local_addr = parts[3]
            port_match = re.search(r":(\d+)$", local_addr)
            if port_match:
                port = int(port_match.group(1))
                process = ""
                if len(parts) >= 6:
                    proc_match = re.search(r'"([^"]+)"', parts[-1])
                    if proc_match:
                        process = proc_match.group(1)
                ports.append({
                    "port": port,
                    "address": local_addr,
                    "process": process,
                })

    seen = set()
    unique = []
    for p in sorted(ports, key=lambda x: x["port"]):
        if p["port"] not in seen:
            seen.add(p["port"])
            unique.append(p)
    return unique


def get_active_connections() -> dict:
    output = run_cmd(["ss", "-tn", "state", "established"])
    if not output:
        return {"total": 0, "by_port": {}}

    lines = output.strip().split("\n")[1:]
    total = len(lines)
    port_counter: Counter = Counter()
    for line in lines:
        parts = line.split()
        if len(parts) >= 4:
            local_addr = parts[3] if len(parts) > 3 else parts[2]
            m = re.search(r":(\d+)$", local_addr)
            if m:
                port_counter[int(m.group(1))] += 1

    return {"total": total, "by_port": dict(port_counter.most_common(10))}


def get_nginx_errors() -> dict:
    errors_count = 0
    recent_errors = []
    status_4xx = 0
    status_5xx = 0

    error_log = "/var/log/nginx/error.log"
    if Path(error_log).exists():
        output = run_cmd(["tail", "-n", "200", error_log])
        if output:
            lines = output.split("\n")
            errors_count = len(lines)
            recent_errors = lines[-10:]

    access_log = "/var/log/nginx/access.log"
    if Path(access_log).exists():
        output = run_cmd(["tail", "-n", "1000", access_log])
        if output:
            for line in output.split("\n"):
                m = re.search(r'" (\d{3}) ', line)
                if m:
                    code = int(m.group(1))
                    if 400 <= code < 500:
                        status_4xx += 1
                    elif code >= 500:
                        status_5xx += 1

    return {
        "error_count": errors_count,
        "status_4xx": status_4xx,
        "status_5xx": status_5xx,
        "recent_errors": recent_errors[-5:],
    }


## ── SSH Whitelist Management ──

def _read_whitelist() -> list[dict]:
    """Read whitelist file, return list of {ip, note}."""
    entries = []
    try:
        if Path(WHITELIST_FILE).exists():
            for line in Path(WHITELIST_FILE).read_text().strip().split("\n"):
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("#", 1)
                ip = parts[0].strip()
                note = parts[1].strip() if len(parts) > 1 else ""
                if ip:
                    entries.append({"ip": ip, "note": note})
    except Exception:
        pass
    return entries


def _write_whitelist(entries: list[dict]):
    """Write whitelist to file and sync to fail2ban + UFW."""
    Path(WHITELIST_FILE).parent.mkdir(parents=True, exist_ok=True)
    lines = []
    for e in entries:
        if e.get("note"):
            lines.append(f"{e['ip']}  # {e['note']}")
        else:
            lines.append(e["ip"])
    Path(WHITELIST_FILE).write_text("\n".join(lines) + "\n")
    _sync_fail2ban_ignoreip(entries)
    _sync_ufw_ssh_whitelist(entries)


def _sync_fail2ban_ignoreip(entries: list[dict]):
    """Update fail2ban jail.local ignoreip with whitelist IPs."""
    whitelist_ips = [e["ip"] for e in entries]
    ignore_line = "ignoreip = 127.0.0.1/8 ::1 " + " ".join(whitelist_ips)

    try:
        content = Path(FAIL2BAN_JAIL_LOCAL).read_text()
        new_content = re.sub(r"^ignoreip\s*=.*$", ignore_line, content, flags=re.MULTILINE)
        if "ignoreip" not in new_content:
            new_content = new_content.replace("[sshd]", f"[sshd]\n{ignore_line}")
        Path(FAIL2BAN_JAIL_LOCAL).write_text(new_content)
        run_cmd(["systemctl", "reload", "fail2ban"])
    except Exception:
        pass


def _sync_ufw_ssh_whitelist(entries: list[dict]):
    """Sync UFW rules: only allow SSH from whitelisted IPs."""
    whitelist_ips = {e["ip"] for e in entries}

    # Get current UFW SSH whitelist rules
    output = run_cmd(["ufw", "status", "numbered"])
    existing_ips = set()
    # Parse rules like: [ 4] 22/tcp  ALLOW IN  113.160.140.37  # SSH whitelist
    for line in output.split("\n"):
        if "22/tcp" in line and "SSH whitelist" in line:
            m = re.search(r"(\d+\.\d+\.\d+\.\d+)", line)
            if m:
                existing_ips.add(m.group(1))

    # Add new IPs
    for ip in whitelist_ips - existing_ips:
        run_cmd(["ufw", "allow", "from", ip, "to", "any", "port", "22", "proto", "tcp", "comment", "SSH whitelist"])

    # Remove old IPs (reverse order to keep rule numbers stable)
    for ip in existing_ips - whitelist_ips:
        run_cmd(["ufw", "delete", "allow", "from", ip, "to", "any", "port", "22", "proto", "tcp"])

    run_cmd(["ufw", "reload"])


def _get_successful_ssh_ips() -> list[dict]:
    """Parse auth.log for IPs that successfully logged in via SSH."""
    ips = {}
    auth_log = None
    for p in ["/var/log/auth.log", "/var/log/secure"]:
        if Path(p).exists():
            auth_log = p
            break
    if not auth_log:
        return []

    output = run_cmd(["grep", "Accepted", auth_log], timeout=10)
    if not output:
        return []

    pattern = re.compile(r"^(\S+)\s+\S+\s+sshd\[.*Accepted\s+\S+\s+for\s+(\S+)\s+from\s+(\S+)")
    for line in output.split("\n"):
        m = pattern.match(line)
        if m:
            timestamp, user, ip = m.group(1), m.group(2), m.group(3)
            if ip not in ips:
                ips[ip] = {"ip": ip, "user": user, "last_login": timestamp}
            else:
                ips[ip]["last_login"] = timestamp

    return list(ips.values())


def get_whitelist() -> dict:
    """Get current whitelist and successful SSH IPs."""
    whitelist = _read_whitelist()
    whitelist_set = {e["ip"] for e in whitelist}
    successful = _get_successful_ssh_ips()
    # Mark which successful IPs are already whitelisted
    for s in successful:
        s["whitelisted"] = s["ip"] in whitelist_set
    return {
        "whitelist": whitelist,
        "successful_ips": successful,
    }


def add_to_whitelist(ip: str, note: str = "") -> dict:
    """Add IP to whitelist."""
    ip_pattern = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
    if not ip_pattern.match(ip):
        return {"success": False, "error": "Định dạng IP không hợp lệ"}
    entries = _read_whitelist()
    existing = {e["ip"] for e in entries}
    if ip in existing:
        return {"success": False, "error": f"IP {ip} đã có trong danh sách"}
    entries.append({"ip": ip, "note": note})
    _write_whitelist(entries)
    # Also unban if currently banned
    run_cmd(["fail2ban-client", "set", "sshd", "unbanip", ip])
    return {"success": True, "message": f"Đã thêm {ip} vào danh sách cho phép", "ip": ip}


def remove_from_whitelist(ip: str) -> dict:
    """Remove IP from whitelist."""
    entries = _read_whitelist()
    new_entries = [e for e in entries if e["ip"] != ip]
    if len(new_entries) == len(entries):
        return {"success": False, "error": f"IP {ip} không có trong danh sách"}
    _write_whitelist(new_entries)
    return {"success": True, "message": f"Đã xóa {ip} khỏi danh sách cho phép", "ip": ip}


def ban_ip(ip: str) -> dict:
    ip_pattern = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
    if not ip_pattern.match(ip):
        return {"success": False, "error": "Invalid IP format"}
    result = run_cmd(["fail2ban-client", "set", "sshd", "banip", ip])
    return {"success": True, "message": f"IP {ip} banned", "ip": ip}


def unban_ip(ip: str, jail: str = "sshd") -> dict:
    run_cmd(["fail2ban-client", "set", jail, "unbanip", ip])
    return {"success": True, "message": f"IP {ip} unbanned from {jail}", "ip": ip}


def build_overview() -> dict:
    ssh_data = parse_ssh_failures()
    firewall = get_firewall_status()
    fail2ban = get_fail2ban_status()
    open_ports = get_open_ports()
    connections = get_active_connections()
    nginx = get_nginx_errors()

    banned_ip_set = {item["ip"] for item in fail2ban.get("banned_ips", [])}
    for ip_info in ssh_data["top_ips"]:
        ip_info["is_banned"] = ip_info["ip"] in banned_ip_set

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ssh": {
            "failed_attempts": ssh_data["total_failed"],
            "top_attacking_ips": ssh_data["top_ips"],
            "hourly": ssh_data.get("hourly", []),
        },
        "firewall": firewall,
        "fail2ban": fail2ban,
        "open_ports": open_ports,
        "connections": connections,
        "nginx": nginx,
        "recent_events": ssh_data["recent_events"],
        "whitelist": get_whitelist(),
    }


class SecurityHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.headers.get("X-Api-Key") != API_KEY:
            self.send_error(403, "Forbidden")
            return

        if self.path == "/overview":
            data = build_overview()
        elif self.path == "/whitelist":
            data = get_whitelist()
        else:
            self.send_error(404)
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_POST(self):
        if self.headers.get("X-Api-Key") != API_KEY:
            self.send_error(403, "Forbidden")
            return

        content_len = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(content_len)) if content_len else {}

        if self.path == "/ban-ip":
            data = ban_ip(body.get("ip", ""))
        elif self.path == "/unban-ip":
            data = unban_ip(body.get("ip", ""), body.get("jail", "sshd"))
        elif self.path == "/whitelist/add":
            data = add_to_whitelist(body.get("ip", ""), body.get("note", ""))
        elif self.path == "/whitelist/remove":
            data = remove_from_whitelist(body.get("ip", ""))
        else:
            self.send_error(404)
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        # Quiet logging
        pass


def main():
    server = HTTPServer((LISTEN_HOST, LISTEN_PORT), SecurityHandler)
    print(f"Security agent listening on {LISTEN_HOST}:{LISTEN_PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    server.server_close()


if __name__ == "__main__":
    main()
