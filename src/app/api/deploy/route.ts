import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    // Fire-and-forget: spawn detached so it survives PM2 restart
    const { spawn } = require("child_process");
    const child = spawn("/opt/plan-app-deploy/deploy.sh", [], {
      cwd: "/opt/plan-app-deploy",
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.unref();

    // Return immediately — deploy runs in background
    return NextResponse.json({
      success: true,
      message: "Deploy started. App will restart in ~30s.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
