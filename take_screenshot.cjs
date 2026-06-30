const { spawn } = require("child_process");
const puppeteer = require("puppeteer");
const path = require("path");

const server = spawn("npm", ["run", "dev", "--", "--port", "5180"], {
  cwd: "C:\\Users\\adm_ti\\desktop\\portal-colaborador",
  shell: true,
  stdio: ["ignore", "pipe", "pipe"]
});

let ready = false;
server.stdout.on("data", (d) => {
  const text = d.toString();
  if (!ready && (text.includes("localhost") || text.includes("ready"))) {
    ready = true;
    const m = text.match(/:(\d+)/);
    const port = m ? m[1] : "5180";
    setTimeout(() => takeShot(port), 2000);
  }
});
server.stderr.on("data", () => {});

async function takeShot(port) {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  try {
    await page.goto("http://localhost:" + port, { waitUntil: "networkidle2", timeout: 20000 });
    await new Promise(r => setTimeout(r, 2800));
    await page.screenshot({ path: "C:\\Users\\adm_ti\\desktop\\login_preview.png" });
    console.log("Screenshot salvo: login_preview.png porta=" + port);
  } catch(e) {
    console.error("Erro:", e.message);
  } finally {
    await browser.close();
    server.kill();
    process.exit(0);
  }
}

setTimeout(() => { console.error("timeout"); server.kill(); process.exit(1); }, 45000);
