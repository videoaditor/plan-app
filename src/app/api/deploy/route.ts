import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    // Use setsid + nohup so deploy survives PM2 killing this process
    const { execSync } = require("child_process");
    execSync(
      'setsid nohup /opt/plan-app-deploy/deploy.sh > /opt/plan-app-deploy/deploy.log 2>&1 &',
      { cwd: "/opt/plan-app-deploy", timeout: 5000 }
    );

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
