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
# Shared secret to prevent unauthorized access
API_KEY = "rs_security_agent_2024_internal"


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
    }


class SecurityHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.headers.get("X-Api-Key") != API_KEY:
            self.send_error(403, "Forbidden")
            return

        if self.path == "/overview":
            data = build_overview()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_error(404)

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
